---
title: "Idempotencia en APIs REST: cómo evitar operaciones duplicadas con Spring Boot"
description: "Qué es la idempotencia, por qué es importante en APIs REST y cómo implementarla correctamente en Spring Boot."
category: "java"
tags: ["java", "spring-boot", "api-rest", "idempotencia", "idempotency-key", "buenas-practicas"]
author: "bernalac"
cover: "./images/idempotencia-api-rest.webp"
date: 2026-08-13
updatedAt: 2026-08-13
draft: false
robots: true
---
Cuando desarrollamos una API REST solemos asumir un flujo sencillo: el cliente envía una petición, el servidor la procesa y devuelve una respuesta. Fin de la historia.

En un sistema real, sin embargo, las cosas no siempre funcionan así.

Una petición puede procesarse correctamente en el servidor y, justo después, perderse la respuesta por un problema de red. Desde el punto de vista del cliente, la operación ha fallado. ¿Qué hará entonces? Probablemente **reintentarlo**.

Y ahí aparece un problema serio cuando la operación tiene efectos secundarios: crear un pedido dos veces, cobrar un pago dos veces o crear una reserva duplicada.

En este artículo veremos qué significa que una operación sea **idempotente**, por qué es especialmente importante en APIs REST y cómo implementar un mecanismo de `Idempotency-Key` en Spring Boot que tenga en cuenta la concurrencia.

También veremos una **limitación importante**: una transacción de base de datos no convierte automáticamente una operación distribuida en una operación ejecutada una única vez. Cuando intervienen servicios externos, colas o proveedores de pago, necesitamos mecanismos adicionales.

### Índice
1. [El problema de los reintentos](#el-problema-de-los-reintentos)
2. [¿Qué significa que una operación sea idempotente?](#qué-significa-que-una-operación-sea-idempotente)
3. [¿Por qué POST suele ser el problema?](#por-qué-post-suele-ser-el-problema)
4. [Idempotency-Key](#idempotency-key)
5. [Una primera implementación y por qué no basta](#una-primera-implementación-y-por-qué-no-basta)
6. [El problema de la concurrencia](#el-problema-de-la-concurrencia)
7. [Diseñando la tabla de idempotencia](#diseñando-la-tabla-de-idempotencia)
8. [Implementación con Spring Boot](#implementación-con-spring-boot)
9. [Estados de una operación idempotente](#estados-de-una-operación-idempotente)
10. [¿Cuánto tiempo conservar una Idempotency-Key?](#cuánto-tiempo-conservar-una-idempotency-key)
11. [¿Qué ocurre con servicios externos?](#qué-ocurre-con-servicios-externos)
12. [¿Todas las peticiones necesitan idempotencia?](#todas-las-peticiones-necesitan-idempotencia)
13. [Respuestas HTTP](#respuestas-http)
14. [Buenas prácticas](#buenas-prácticas)
15. [Conclusión](#conclusión)


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

El servidor **sí** ha creado el pedido. El cliente, sin embargo, no ha recibido confirmación. Desde su perspectiva, la operación ha fallado, así que reintenta la petición.

Si el servidor no tiene ningún mecanismo para reconocer ese reintento, volverá a ejecutar la operación:

```text
Pedido #1001
Pedido #1002
```

El cliente solo quería un pedido. Se ha creado dos veces.

Este problema no se limita a caídas de red. También aparece por:

* Timeouts
* Proxies y balanceadores que cortan conexiones
* Reintentos automáticos de librerías HTTP
* Clientes móviles con conectividad inestable
* Consumidores de colas que reprocesan mensajes

Por eso una API robusta debe asumir que **una misma operación puede llegar al servidor más de una vez**.

---

## ¿Qué significa que una operación sea idempotente?

Una operación es idempotente cuando ejecutarla una vez o varias veces produce **el mismo estado final**.

Por ejemplo:

```http
PUT /users/123
Content-Type: application/json

{
    "name": "bernalac"
}
```

Si esta petición se procesa varias veces, el resultado final sigue siendo: `Usuario 123 → bernalac`.

En cambio:

```http
POST /orders
```

puede crear un recurso nuevo cada vez:

```text
POST → Pedido #1001
POST → Pedido #1002
POST → Pedido #1003
```

Esto no significa que una `API` no pueda diseñar un `POST` con comportamiento idempotente. Significa que `POST` no tiene esa garantía por defecto en `HTTP` y que, cuando necesitamos evitar duplicados, debemos añadir un mecanismo adecuado.

De la misma forma, que `PUT` sea idempotente según la semántica `HTTP` no significa que cualquier implementación imaginable de `PUT` esté libre de efectos secundarios adicionales.

La pregunta relevante siempre es:

> **¿Qué ocurre si esta misma operación se procesa más de una vez?**

---

## ¿Por qué POST suele ser el problema?

En una API REST usamos `POST` para crear recursos:

```http
POST /payments
POST /orders
POST /reservations
```

Cada petición suele representar una nueva operación. Por eso un reintento accidental puede generar un segundo recurso o repetir un efecto secundario.

Por ejemplo, si tenemos:

```http
POST /payments
```

y el cliente recibe un timeout, no sabe si el servidor llegó a procesar el pago o no. Necesitamos un mecanismo que permita distinguir *"Quiero realizar un pago nuevo"* de *"Quiero volver a enviar el mismo pago porque no recibí la respuesta"*. Ahí entra `Idempotency-Key`.

---

## Idempotency-Key

La idea es sencilla: **el cliente genera un identificador único por operación** y lo envía en una cabecera HTTP.

Normalmente puede utilizarse un `UUID`:

```http
POST /orders
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{
    "productId": 123,
    "quantity": 2
}
```

La clave representa una intención concreta del cliente.

El flujo sería:

```text
                 POST /orders
                      │
                      ▼
              Idempotency-Key
                      │
                      ▼
               ¿Existe la key?
                 /         \
               NO           SÍ
               │             │
               ▼             ▼
          Reservar key    Comprobar estado
               │             │
               ▼             ├── COMPLETED → devolver resultado
          Procesar           ├── PENDING   → indicar que sigue en curso
               │             └── FAILED   → aplicar política definida
               ▼
       Guardar resultado
```

La primera petición que consigue reservar la clave procesa la operación. Las peticiones posteriores reutilizan el resultado si la operación ya terminó.

Si una petición llega mientras la primera sigue procesándose, debemos tener una política explícita para el estado `PENDING`.

---

## Una primera implementación y por qué no basta

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

Parece razonable, pero contiene una condición de carrera: la comprobación y la ejecución no son una operación atómica.

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

Ambas peticiones comprueban `existsById` **antes** de que ninguna haya guardado nada. Las dos ven que la clave no existe y ambas continuan.

El resultado puede ser:

```text
Pedido #1001
Pedido #1002
```

Hemos recreado exactamente el problema que queríamos evitar. Esto deja una lección clara:

> **La idempotencia no se puede garantizar solo con un `if` en Java.** 

Necesitamos que la base de datos participe activamente en la garantía de unicidad, mediante una restricción `PRIMARY KEY` o `UNIQUE`.

---

## Diseñando la tabla de idempotencia

Creamos una entidad dedicada a registrar las operaciones procesadas:

```java
@Entity
@Table(name = "idempotency_keys")
public class IdempotencyKeyEntity {

    @Id
    @Column(name = "idempotency_key", nullable = false, length = 255)
    private String idempotencyKey;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private IdempotencyStatus status;

    @Lob
    @Column(name = "response")
    private String response;

    @Column(name = "http_status")
    private Integer httpStatus;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    protected IdempotencyKeyEntity() {}

    public IdempotencyKeyEntity(String idempotencyKey, String requestHash,
                                 IdempotencyStatus status, Instant createdAt) {
        this.idempotencyKey = idempotencyKey;
        this.requestHash = requestHash;
        this.status = status;
        this.createdAt = createdAt;
    }

    // getters, setters
}
```

Una tabla equivalente podría ser:

```sql
CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    request_hash    VARCHAR(64) NOT NULL,
    status          VARCHAR(20) NOT NULL,
    response        TEXT,
    http_status     INTEGER,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at    TIMESTAMP WITH TIME ZONE
);
```

Tenemos dos piezas especialmente importantes.

* **`idempotency_key` como clave primaria**

La base de datos garantiza que no pueden existir dos registros con la misma clave.

Si dos peticiones intentan reservar la misma clave al mismo tiempo, **solo una podrá crear el registro**. La otra encontrará la restricción de unicidad y podremos tratar ese caso como una clave que ya existe.

* **`request_hash`**

También debemos detectar este caso:

```
Petición 1
Idempotency-Key: abc
productId: 123
quantity: 2

Petición 2
Idempotency-Key: abc
productId: 999
quantity: 10
```

La misma clave no debería representar **dos operaciones diferentes**.

Por eso almacenamos un **hash** de los datos relevantes de la petición.

El hash debe calcularse a partir de una **representación determinista de esos datos**, por ejemplo un JSON canónico, utilizando SHA-256 u otro algoritmo criptográfico adecuado. No conviene utilizar simplemente `Object.hashCode()`.

---

## Implementación con Spring Boot

El repositorio puede ser muy sencillo:

```java
public interface IdempotencyKeyRepository
        extends JpaRepository<IdempotencyKeyEntity, String> {
}
```

Y el servicio puede separar el ciclo de vida de la clave en varias operaciones:

```java
@Service
public class OrderService {

    private final IdempotencyKeyRepository idempotencyRepository;
    private final OrderRepository orderRepository;

    public OrderService(
            IdempotencyKeyRepository idempotencyRepository,
            OrderRepository orderRepository
    ) {
        this.idempotencyRepository = idempotencyRepository;
        this.orderRepository = orderRepository;
    }

    public OrderResponse createOrder(
            String idempotencyKey,
            CreateOrderRequest request
    ) {
        String requestHash = hash(request);

        boolean reserved = tryReserveKey(
                idempotencyKey,
                requestHash
        );

        if (!reserved) {
            return handleExistingKey(
                    idempotencyKey,
                    requestHash
            );
        }

        try {
            OrderResponse response = processOrder(request);

            completeKey(
                    idempotencyKey,
                    response
            );

            return response;

        } catch (RuntimeException e) {

            failKey(idempotencyKey);

            throw e;
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryReserveKey(
            String idempotencyKey,
            String requestHash
    ) {
        try {
            IdempotencyKeyEntity entity =
                    new IdempotencyKeyEntity(
                            idempotencyKey,
                            requestHash,
                            IdempotencyStatus.PENDING,
                            Instant.now()
                    );

            idempotencyRepository.saveAndFlush(entity);

            return true;

        } catch (DataIntegrityViolationException e) {
            return false;
        }
    }

    @Transactional
    public OrderResponse processOrder(
            CreateOrderRequest request
    ) {
        return orderRepository.create(request);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completeKey(
            String idempotencyKey,
            OrderResponse response
    ) {
        IdempotencyKeyEntity entity =
                idempotencyRepository
                        .findById(idempotencyKey)
                        .orElseThrow();

        entity.setStatus(
                IdempotencyStatus.COMPLETED
        );

        entity.setResponse(
                toJson(response)
        );

        entity.setHttpStatus(201);

        entity.setCompletedAt(
                Instant.now()
        );

        idempotencyRepository.save(entity);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failKey(
            String idempotencyKey
    ) {
        IdempotencyKeyEntity entity =
                idempotencyRepository
                        .findById(idempotencyKey)
                        .orElseThrow();

        entity.setStatus(
                IdempotencyStatus.FAILED
        );

        entity.setCompletedAt(
                Instant.now()
        );

        idempotencyRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public OrderResponse handleExistingKey(
            String idempotencyKey,
            String requestHash
    ) {
        IdempotencyKeyEntity existing =
                idempotencyRepository
                        .findById(idempotencyKey)
                        .orElseThrow();

        if (!existing.getRequestHash().equals(requestHash)) {
            throw new IdempotencyConflictException(
                    "La Idempotency-Key ya se usó con una petición diferente"
            );
        }

        return switch (existing.getStatus()) {

            case COMPLETED ->
                    fromJson(existing.getResponse());

            case FAILED ->
                    throw new OperationFailedException(
                            idempotencyKey
                    );

            case PENDING ->
                    throw new OperationInProgressException(
                            idempotencyKey
                    );
        };
    }
}
```

Hay varios detalles importantes en este diseño.

* La reserva de la clave es independiente, `tryReserveKey()` utiliza `REQUIRES_NEW` para que la reserva de la clave se confirme independientemente de lo que ocurra después con la operación de negocio.
* La reserva de la clave y `processOrder()` no están en la misma transacción. Queremos poder representar que una operación está `PENDING` incluso si la transacción posterior falla o si el pedido se guarda correctamente, después actualizamos la clave a **COMPLETED**.
* La base de datos resuelve la carrera, el `saveAndFlush()` fuerza a que el **INSERT** se ejecute dentro de la transacción de reserva. La restricción **PRIMARY KEY** impide que dos peticiones puedan reservar simultáneamente la misma clave.

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

### COMPLETED

La operación terminó correctamente. Una nueva petición con la misma key y el mismo hash debe recibir el resultado almacenado, sin ejecutar de nuevo la operación.

### PENDING

Otra petición consiguió reservar la clave y todavía está procesando la operación.

No existe una única respuesta correcta. Para un ejemplo sencillo, devolver `409 Conflict` es una opción razonable.

Hay un escenario que no debemos ignorar: `PENDING` puede quedar huérfano.

El cliente reintenta y encuentra `PENDING`, pero la operación real ya terminó.

Por eso una implementación de producción necesita una **estrategia de recuperación**.

Algunas opciones son:

* Guardar `expires_at` y considerar caducadas las claves `PENDING` antiguas
* Consultar el recurso de negocio antes de volver a ejecutar la operación

Es importante entender que un estado `PENDING` no debe quedar sin mecanismo de recuperación en una implementación real.

### FAILED

En este ejemplo consideramos que la clave queda **consumida** aunque la operación falle.

Eso significa que una nueva petición con la misma clave **no vuelve a ejecutar automáticamente la operación**. El cliente debe generar una nueva `Idempotency-Key` si quiere iniciar una nueva operación.

Esta es una **decisión de diseño**, no una regla universal.

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

El tiempo adecuado depende del tipo de la operación: para un pago puede tener sentido conservarla varios días. 

Para una operación interna de bajo riesgo, unas pocas horas puede ser suficiente. 

Conviene definir explícitamente:

* Cuánto tiempo se conserva cada clave
* Qué ocurre si la misma clave llega después de haber expirado
* Cómo y cuándo se limpian las claves antiguas
* Qué ocurre con las claves que siguen en `PENDING`

---

## Qué ocurre con servicios externos

Aquí aparece una de las limitaciones más importantes.

Supongamos que `processOrder()` hace algo así:

```text
Base de datos
     │
     ▼
Crear pedido
     │
     ▼
Proveedor de pagos
     │
     ▼
Cobrar tarjeta
```

Nuestra transacción de base de datos no puede hacer rollback de una llamada HTTP que ya se ejecutó en otro **sistema**.

La base de datos puede volver atrás, pero el pago externo ya ocurrió.

Por eso, cuando intervienen servicios externos, necesitamos **garantías adicionales**.

La opción más sencilla es que el propio proveedor externo soporte idempotencia y podamos enviarle una clave única.

## ¿Todas las peticiones necesitan idempotencia?

**No**. Añadir este mecanismo a todos los endpoints sería innecesario.

Por ejemplo:

```http
GET /orders/100
```

No necesita una `Idempotency-Key`.

`GET`, `HEAD` y `OPTIONS` son métodos seguros y, por definición, también son idempotentes. `PUT` y `DELETE` también son idempotentes según la semántica HTTP, aunque no sean métodos seguros.

La idempotencia adicional suele ser especialmente interesante cuando una operación tiene efectos secundarios costosos de duplicar:

```text
Crear un pedido
Realizar un pago
Crear una reserva
Enviar una transferencia
Procesar una compra
```

La pregunta que debemos hacernos en cada endpoint es:

> **¿Qué ocurre si esta operación se ejecuta dos veces por un reintento?**

Si la respuesta es **"podría causar un problema real"**, debemos plantearnos cómo hacerla idempotente.

---

## Respuestas HTTP

Una **implementación real** debería definir claramente qué respuesta corresponde a cada estado.

| Estado         | Situación                           | Respuesta posible                     |
| -------------- | ----------------------------------- | ------------------------------------- |
| `COMPLETED`    | La operación ya terminó             | Devolver la misma respuesta original  |
| `PENDING`      | Otra petición la está procesando    | `409 Conflict`                        |
| `FAILED`       | La operación falló                  | Devolver el error definido por la API |
| Hash diferente | La key se reutilizó con otros datos | `409 Conflict`                        |

No es obligatorio utilizar exactamente estos códigos en todos los sistemas. Lo importante es que el contrato sea explícito y consistente.

## Buenas prácticas

* Usa una `Idempotency-Key` única por operación, generada por el cliente (normalmente un UUID).
* No dependas únicamente de un `exists()` previo: apóyate en una restricción `UNIQUE` o clave primaria para resolver la concurrencia.
* Guarda un hash de los datos relevantes de la petición para detectar reutilizaciones incorrectas de la misma key.
* Representa explícitamente los estados (`PENDING`, `COMPLETED`, `FAILED`) y decide qué hacer con cada uno.
* Define una política de expiración o recuperación para las claves.
* Conserva la respuesta original si quieres que los reintentos reciban el mismo resultado.
* Define cuánto tiempo se conservan las claves y cómo se limpian.
* Si llamas a un proveedor externo, utiliza su mecanismo de idempotencia cuando exista.
* No añadas idempotencia por defecto a endpoints donde no aporta ningún beneficio real.

---

## Conclusión

La idempotencia puede parecer un detalle innecesario cuando todo funciona bien: la petición llega, se procesa, llega la respuesta. El problema aparece en cuanto entran en escena redes poco fiables, timeouts, balanceadores y sistemas distribuidos, donde asumir que una petición se procesa exactamente una vez es, sencillamente, un error de diseño.

`Idempotency-Key` nos da la base para identificar una operación concreta y evitar que un reintento provoque efectos duplicados. Pero, como hemos visto, una implementación realmente robusta no es una comprobación `if (exists)`: requiere apoyarse en restricciones de base de datos para resolver la concurrencia, transacciones para mantener la consistencia, un hash de petición para evitar reutilizaciones incorrectas y una gestión explícita de los estados.

La idempotencia no es solo una cabecera HTTP. Es una decisión de diseño que hace que tus APIs sean resistentes a los fallos inevitables de cualquier sistema distribuido.

---

## Bibliografía

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110)
- [Spring Framework — Transaction Management](https://docs.spring.io/spring-framework/reference/data-access/transaction/declarative/annotations.html)
- [Spring Data JPA — Reference Documentation](https://docs.spring.io/spring-data/jpa/reference/)
- [Spring Data JPA — JpaRepository API](https://docs.spring.io/spring-data/jpa/docs/current/api/org/springframework/data/jpa/repository/JpaRepository.html)
- [Stripe — Idempotent requests](https://docs.stripe.com/api/idempotent_requests)