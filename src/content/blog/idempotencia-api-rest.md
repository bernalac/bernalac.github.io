---
title: "Idempotencia en APIs REST: cómo evitar operaciones duplicadas con Spring Boot"
description: "Qué es la idempotencia, por qué es importante en APIs REST y cómo implementar Idempotency-Key correctamente en Spring Boot."
category: "java"
tags: ["java", "spring-boot", "api-rest", "idempotencia", "idempotency-key", "buenas-practicas"]
author: "Javier Bernal"
cover: "./images/idempotencia-api-rest.webp"
date: 2026-08-13
updatedAt: 2026-08-13
draft: true
robots: true
---

Cuando desarrollamos una API REST solemos asumir un flujo idílico: el cliente envía una petición, el servidor la procesa y devuelve una respuesta. Fin de la historia.

En un sistema real, sin embargo, las cosas no siempre funcionan así.

Una petición puede procesarse **correctamente** en el servidor y, justo después, perderse la respuesta por un problema de red. Desde el punto de vista del cliente, la operación ha fallado. ¿Qué hará entonces? Probablemente reintentarlo.

Y ahí aparece un problema serio cuando la operación tiene efectos secundarios: crear un pedido dos veces, cobrar un pago dos veces, enviar una transferencia dos veces.

En este artículo veremos qué significa que una operación sea **idempotente**, por qué es especialmente importante en APIs REST, y cómo implementar un mecanismo de idempotencia con `Idempotency-Key` en Spring Boot que aguante concurrencia real y no solo el caso feliz.

### Índice

1. [El problema de los reintentos](#el-problema-de-los-reintentos)
2. [¿Qué significa que una operación sea idempotente?](#qué-significa-que-una-operación-sea-idempotente)
3. [¿Por qué POST suele ser el problema?](#por-qué-post-suele-ser-el-problema)
4. [Idempotency-Key](#idempotency-key)
5. [Una primera implementación (y por qué no basta)](#una-primera-implementación-y-por-qué-no-basta)
6. [El problema de la concurrencia](#el-problema-de-la-concurrencia)
7. [Diseñando la tabla de idempotencia](#diseñando-la-tabla-de-idempotencia)
8. [Implementación robusta con Spring Boot](#implementación-robusta-con-spring-boot)
9. [Estados de una operación idempotente](#estados-de-una-operación-idempotente)
10. [¿Cuánto tiempo conservar una Idempotency-Key?](#cuánto-tiempo-conservar-una-idempotency-key)
11. [¿Todas las peticiones necesitan idempotencia?](#todas-las-peticiones-necesitan-idempotencia)
12. [Buenas prácticas](#buenas-prácticas)
13. [Conclusión](#conclusión)

---

## El problema de los reintentos

Supongamos que tenemos una API para crear pedidos. El cliente envía:

```http
POST /orders
Content-Type: application/json

{
    "productId": 123,
    "quantity": 2
}
```

El servidor procesa la operación sin problemas:

```text
Cliente
   │
   │ POST /orders
   ▼
Servidor
   │
   ├── Crear pedido
   │
   └── Pedido creado correctamente
```

Y devuelve:

```http
201 Created
```

Pero justo en ese instante hay un problema de red:

```text
Servidor ────────X────────> Cliente
              respuesta perdida
```

El servidor **sí** ha creado el pedido. El cliente, sin embargo, no ha recibido confirmación. Desde su perspectiva, la operación ha fallado, así que reintenta:

```http
POST /orders
Content-Type: application/json

{
    "productId": 123,
    "quantity": 2
}
```

El servidor vuelve a procesar la operación y ahora tenemos:

```text
Pedido #1001
Pedido #1002
```

El cliente solo quería un pedido. Se ha creado dos veces.

Este problema no se limita a caídas de red. También aparece por:

* timeouts
* proxies y balanceadores que cortan conexiones
* reintentos automáticos de librerías HTTP
* clientes móviles con conectividad inestable
* consumidores de colas que reprocesan mensajes

Por eso una API robusta debe asumir que **una misma operación puede llegar al servidor más de una vez**.

---

## ¿Qué significa que una operación sea idempotente?

Una operación es idempotente cuando ejecutarla una vez o varias veces produce **el mismo estado final**.

```http
PUT /users/123

{
    "name": "Javier"
}
```

Da igual si esta petición se ejecuta una vez o cinco: el resultado siempre es `Usuario 123 → Javier`.

En cambio:

```http
POST /orders
```

ejecutada varias veces puede crear varios recursos distintos:

```text
POST → Pedido #1001
POST → Pedido #1002
POST → Pedido #1003
```

Esto no significa que `POST` sea *siempre* no idempotente, ni que `PUT` sea automáticamente inmune a la duplicación (piensa en un `PUT` que incrementa un contador). La idempotencia es una propiedad del **comportamiento** de la operación, no del verbo HTTP en sí. La pregunta relevante siempre es:

> **¿Qué ocurre si esta misma operación se procesa más de una vez?**

---

## ¿Por qué POST suele ser el problema?

En una API REST usamos `POST` para crear recursos:

```http
POST /payments
POST /orders
POST /reservations
```

Normalmente esperamos que cada `POST` genere un recurso nuevo, y eso está bien para la mayoría de casos. El problema surge en operaciones donde repetir la llamada tiene un coste real, como un pago:

```http
POST /payments
```

Si el cliente reintenta tras un timeout, no queremos cobrarle dos veces. Necesitamos un mecanismo que permita distinguir *"esta es una petición nueva"* de *"esta es la misma intención del cliente, reenviada"*. Ahí entra `Idempotency-Key`.

---

## Idempotency-Key

La solución habitual es que el **cliente** genere un identificador único por operación (normalmente un UUID) y lo envíe en una cabecera:

```http
POST /orders
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
    "productId": 123,
    "quantity": 2
}
```

La idea es simple:

> Mientras esa `Idempotency-Key` represente una operación que ya hemos procesado, volver a recibirla no debe ejecutar la operación de nuevo.

```text
                   POST /orders
                        │
                        ▼
              Idempotency-Key
                        │
                        ▼
                ¿Existe la key?
                  /          \
                NO            SÍ
                │             │
                ▼             ▼
           Procesar       No procesar
                │             │
                ▼             ▼
        Guardar resultado   Devolver
                            resultado
                            anterior
```

La primera petición procesa la operación de verdad. Las siguientes devuelven el resultado ya calculado.

---

## Una primera implementación (y por qué no basta)

Un primer intento en el controlador podría ser:

```java
@PostMapping("/orders")
public ResponseEntity<OrderResponse> createOrder(
        @RequestHeader("Idempotency-Key") String idempotencyKey,
        @RequestBody CreateOrderRequest request
) {
    OrderResponse response = orderService.createOrder(idempotencyKey, request);
    return ResponseEntity.status(HttpStatus.CREATED).body(response);
}
```

Y en el servicio, algo así:

```java
public OrderResponse createOrder(String idempotencyKey, CreateOrderRequest request) {

    if (repository.existsById(idempotencyKey)) {
        return recoverPreviousResponse(idempotencyKey);
    }

    OrderResponse response = process(request);
    save(idempotencyKey, response);

    return response;
}
```

Parece razonable, pero tiene una condición de carrera que lo invalida en producción.

---

## El problema de la concurrencia

Imagina que llegan dos peticiones con la misma `Idempotency-Key` casi al mismo tiempo (algo muy común cuando un cliente reintenta agresivamente tras un timeout corto):

```text
Request A                  Request B

existsById? NO              existsById? NO
    │                            │
    ▼                            ▼
process()                   process()
    │                            │
    ▼                            ▼
save()                       save()
```

Ambas peticiones comprueban `existsById` **antes** de que ninguna haya guardado nada. Las dos ven que la clave no existe, así que las dos continúan y las dos procesan la operación:

```text
Pedido #1001
Pedido #1002
```

Hemos recreado exactamente el problema que queríamos evitar. Esto deja una lección clara:

> **La idempotencia no se puede garantizar solo con un `if` en Java.** Necesitamos que la base de datos participe activamente en la garantía de unicidad, mediante una restricción única y el manejo de la excepción que lanza al violarse.

---

## Diseñando la tabla de idempotencia

Creamos una entidad dedicada a registrar las operaciones procesadas:

```java
@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKeyEntity {

    @Id
    @Column(name = "idempotency_key")
    private String idempotencyKey;

    @Column(name = "request_hash", nullable = false)
    private String requestHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private IdempotencyStatus status;

    @Lob
    private String response;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    // getters, setters, constructores
}
```

```sql
CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    request_hash    VARCHAR(64)  NOT NULL,
    status          VARCHAR(20)  NOT NULL,
    response        TEXT,
    created_at      TIMESTAMP    NOT NULL
);
```

Aquí ya tenemos dos piezas clave que la versión ingenua no tenía:

* **`idempotency_key` como clave primaria**: la base de datos garantiza que, si dos peticiones intentan insertar la misma clave a la vez, solo una lo conseguirá. La otra recibirá una violación de restricción, que podemos capturar y tratar como "operación ya en curso o completada".
* **`request_hash`**: nos permite detectar si la misma clave se está reutilizando con un cuerpo de petición distinto, algo que también debemos rechazar.

```text
¿La key existe?
       │
       ▼
¿El request hash coincide?
      /       \
    SÍ         NO
    │           │
    ▼           ▼
 devolver    rechazar
 resultado   (409 Conflict)
```

---

## Implementación robusta con Spring Boot

Con la tabla ya definida, el servicio se apoya en la restricción única para resolver la condición de carrera, en lugar de fiarse de una comprobación previa:

```java
public interface IdempotencyKeyRepository
        extends JpaRepository<IdempotencyKeyEntity, String> {
}
```

```java
@Service
public class OrderService {

    private final IdempotencyKeyRepository idempotencyRepository;
    private final OrderRepository orderRepository;

    public OrderService(IdempotencyKeyRepository idempotencyRepository,
                         OrderRepository orderRepository) {
        this.idempotencyRepository = idempotencyRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional
    public OrderResponse createOrder(String idempotencyKey, CreateOrderRequest request) {

        String requestHash = hash(request);

        // 1. Intentamos "reservar" la clave insertándola en estado PENDING.
        //    Si otra petición ya la insertó, la restricción UNIQUE lo impedirá.
        IdempotencyKeyEntity entity = new IdempotencyKeyEntity(
                idempotencyKey, requestHash, IdempotencyStatus.PENDING, null, LocalDateTime.now()
        );

        try {
            idempotencyRepository.saveAndFlush(entity);
        } catch (DataIntegrityViolationException e) {
            // Ya existe una operación con esta key: no la reprocesamos.
            return handleExistingKey(idempotencyKey, requestHash);
        }

        // 2. La clave era nueva: procesamos la operación real.
        OrderResponse response = orderRepository.create(request);

        // 3. Guardamos el resultado y marcamos la operación como completada.
        entity.setStatus(IdempotencyStatus.COMPLETED);
        entity.setResponse(toJson(response));
        idempotencyRepository.save(entity);

        return response;
    }

    private OrderResponse handleExistingKey(String idempotencyKey, String requestHash) {

        IdempotencyKeyEntity existing = idempotencyRepository.findById(idempotencyKey)
                .orElseThrow(); // ya sabemos que existe: falló por duplicado

        if (!existing.getRequestHash().equals(requestHash)) {
            throw new IdempotencyConflictException(
                    "La Idempotency-Key ya se usó con una petición diferente"
            ); // se traduce a 409 Conflict en un @ExceptionHandler
        }

        return switch (existing.getStatus()) {
            case COMPLETED -> fromJson(existing.getResponse());
            case FAILED -> throw new OperationFailedException(idempotencyKey);
            case PENDING -> throw new OperationInProgressException(idempotencyKey);
            // se traduce a 409/425 según el diseño elegido
        };
    }
}
```

Puntos importantes de este diseño:

* El `saveAndFlush` inicial es lo que realmente resuelve la condición de carrera: si dos peticiones llegan a la vez, solo una consigue insertar la fila con esa clave primaria; la otra recibe `DataIntegrityViolationException` de forma determinista, garantizada por la base de datos.
* Todo el método está anotado con `@Transactional`, de modo que si el procesamiento de la operación falla a mitad, no queda una fila `PENDING` "huérfana" sin el resultado ni el pedido creado sin idempotencia asociada.
* La comparación de `requestHash` evita que alguien reutilice una clave con datos distintos por error (o de forma maliciosa).

---

## Estados de una operación idempotente

Representar explícitamente el estado ayuda a decidir qué hacer en cada caso:

```text
             ┌─────────┐
             │ PENDING │
             └────┬────┘
                  │
             procesar
                  │
          ┌───────┴───────┐
          ▼               ▼
     COMPLETED          FAILED
```

Cuando una clave está en `PENDING` (otra petición la está procesando ahora mismo), tenemos varias opciones de diseño, no hay una única correcta:

* devolver `409 Conflict` o `425 Too Early`, dejando que el cliente reintente más tarde
* bloquear brevemente y esperar a que termine
* exponer un mecanismo de *polling* para consultar el estado

La decisión depende de la latencia esperada de la operación y de las garantías que necesite el cliente.

---

## ¿Cuánto tiempo conservar una Idempotency-Key?

No hace falta guardarlas para siempre. Una política habitual es una expiración razonable:

```text
Idempotency-Key
        │
        ▼
   almacenada
        │
        ▼
   24 horas
        │
        ▼
    expirada
        │
        ▼
     eliminar
```

El tiempo adecuado depende del riesgo de la operación: para un pago puede tener sentido conservarla varios días; para una operación interna de bajo riesgo, unas pocas horas puede ser suficiente. Conviene definir explícitamente:

* cuánto tiempo se conserva cada clave
* qué ocurre si la misma clave llega después de haber expirado (¿se trata como nueva?)
* cómo y cuándo se limpian las claves antiguas (job programado, TTL de la base de datos, etc.)

---

## ¿Todas las peticiones necesitan idempotencia?

No. Añadir este mecanismo a todos los endpoints sería sobreingeniería.

```http
GET /orders/100
```

no lo necesita: los métodos seguros (`GET`, `HEAD`) ya son idempotentes por definición y no tienen efectos secundarios.

La idempotencia es relevante sobre todo para operaciones con efectos secundarios costosos de duplicar:

```text
Crear un pedido
Realizar un pago
Crear una reserva
Enviar una transferencia
Procesar una compra
```

La pregunta que hay que hacerse en cada endpoint es siempre la misma:

> **¿Qué ocurre si esta operación se ejecuta dos veces por un retry?**

Si la respuesta es "podría causar un problema real", hay que plantearse idempotencia.

---

## Buenas prácticas

* Usa una `Idempotency-Key` única por operación, generada por el cliente (normalmente un UUID).
* No dependas únicamente de un `exists()` previo: apóyate en una restricción `UNIQUE` o clave primaria y captura la excepción de violación.
* Guarda un hash de la petición junto a la clave para detectar reutilización con datos distintos.
* Envuelve el registro de la clave y el procesamiento de la operación en la misma transacción.
* Representa explícitamente los estados (`PENDING`, `COMPLETED`, `FAILED`) y decide qué hacer con cada uno.
* Define una política de expiración clara para las claves.
* Reserva la idempotencia para operaciones con efectos secundarios reales; no la apliques a endpoints de solo lectura.

---

## Conclusión

La idempotencia puede parecer un detalle innecesario cuando todo funciona bien: la petición llega, se procesa, llega la respuesta. El problema aparece en cuanto entran en escena redes poco fiables, timeouts, balanceadores y sistemas distribuidos, donde asumir que una petición se procesa exactamente una vez es, sencillamente, un error de diseño.

`Idempotency-Key` nos da la base para identificar una operación concreta y evitar que un retry provoque efectos duplicados. Pero, como hemos visto, una implementación realmente robusta no es una comprobación `if (exists)`: requiere apoyarse en restricciones de base de datos para resolver la concurrencia, transacciones para mantener la consistencia, un hash de petición para evitar reutilizaciones incorrectas y una gestión explícita de los estados.

La idempotencia no es solo una cabecera HTTP. Es una decisión de diseño que hace que tus APIs sean resistentes a los fallos inevitables de cualquier sistema distribuido.

---

## Bibliografía

* [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
* [Spring Framework Documentation](https://docs.spring.io/spring-framework/reference/)
* [Spring Data JPA Documentation](https://docs.spring.io/spring-data/jpa/reference/)