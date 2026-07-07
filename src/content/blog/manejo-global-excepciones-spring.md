---
title: "Cómo gestionar excepciones globales en Spring Boot con @RestControllerAdvice"
description: "En este artículo explico cómo centralizar las excepciones en Spring Boot con @ControllerAdvice y así evitar devolver errores inconsistentes mediante API."
category: "java"
tags: ["java", "spring-boot", "excepciones", "api rest", "buenas practicas"]
author: "Javier Bernal"
cover: "./images/manejo-global-excepciones-spring.webp"
date: 2026-06-29
updatedAt: 2026-06-29
draft: false
featured: true
robots: true
---

Cuando desarrollamos una API REST con Spring Boot, es habitual lanzar excepciones desde la capa de servicio: un recurso que no existe, datos de entrada inválidos, un usuario sin permisos o un error inesperado durante la ejecución.

El problema aparece cuando cada controlador gestiona estas excepciones de forma distinta. Algunos devuelven un `404`, otros un `500`, algunos incluyen un cuerpo en la respuesta y otros no devuelven absolutamente nada.

El resultado es una API difícil de mantener y, sobre todo, inconsistente para quien la consume.

En este artículo veremos cómo centralizar el manejo de errores utilizando `@RestControllerAdvice`, creando respuestas homogéneas para toda la aplicación y evitando repetir código en cada controlador.

---

## El problema

Supongamos una API para gestionar autores y libros.

Un primer intento podría ser capturar las excepciones directamente en cada endpoint.

```java
@GetMapping("/autores/{id}")
public ResponseEntity<Autor> getAutor(@PathVariable Long id) {

    try {
        return ResponseEntity.ok(autorService.findById(id));

    } catch (AutorNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .build();
    }

}
```

Otro desarrollador del equipo implementa otro controlador.

```java
@GetMapping("/libros/{id}")
public ResponseEntity<Libro> getLibro(@PathVariable Long id) {

    try {
        return ResponseEntity.ok(libroService.findById(id));

    } catch (LibroNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(null);
    }

}
```

Aunque los dos devuelven un **404**, las respuestas son completamente distintas.

Un cliente que consuma esta API deberá tratar cada endpoint de una forma diferente.

Esto rompe uno de los principios fundamentales de una API REST: **la consistencia**.

---

## ¿Qué ocurre cuando no capturamos una excepción?

Si ninguna excepción es capturada, Spring Boot delega el tratamiento del error a su infraestructura interna.

Por defecto, la petición termina en `BasicErrorController`, que genera una respuesta similar a esta:

```json
{
  "timestamp": "2026-06-29T10:32:14.432+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "path": "/autores/99"
}
```

En versiones antiguas incluso podía mostrarse la conocida **Whitelabel Error Page**.

Aunque esta respuesta es suficiente para depurar durante el desarrollo, resulta poco útil para una aplicación en producción.

El frontend únicamente sabe que ha ocurrido un error, pero desconoce:

- qué ha fallado exactamente
- si puede volver a intentarlo
- si el recurso no existe
- o si el problema es de validación

---

## La solución: centralizar el manejo de excepciones

Spring proporciona una anotación especialmente diseñada para este problema:

```java
@RestControllerAdvice
```

Este componente actúa como un interceptor global.

Cada vez que un controlador lanza una excepción, Spring busca automáticamente un método capaz de gestionarla antes de enviar la respuesta al cliente.

El flujo simplificado sería el siguiente:

```
Cliente
   │
   ▼
Controlador
   │
   ▼
Servicio
   │
   └────────► Excepción
                    │
                    ▼
        @RestControllerAdvice
                    │
                    ▼
         Respuesta JSON uniforme
```

De esta forma eliminamos todos los bloques `try/catch` de los controladores.

Nuestro endpoint vuelve a quedar limpio.

```java
@GetMapping("/autores/{id}")
public Autor getAutor(@PathVariable Long id) {
    return autorService.findById(id);
}
```

Si el servicio lanza una excepción, será el `GlobalExceptionHandler` quien decida qué respuesta devolver.

---

## @ControllerAdvice o @RestControllerAdvice

Ambas anotaciones sirven para centralizar excepciones, pero tienen una diferencia importante.

`@ControllerAdvice`

- Pensado para aplicaciones MVC.
- Puede devolver vistas HTML.

`@RestControllerAdvice`

- Equivale a `@ControllerAdvice + @ResponseBody`.
- Todas las respuestas se serializan automáticamente a JSON.

En una API REST prácticamente siempre utilizaremos `@RestControllerAdvice`.

---

## Diseñando una respuesta de error

Antes de capturar excepciones conviene definir qué aspecto tendrán todas las respuestas de error.

Una práctica habitual consiste en crear un DTO o un `record`.

```java
public record ErrorResponse(

        int status,
        String error,
        String message,
        String path,
        LocalDateTime timestamp

) {}
```

Gracias a este objeto todas las respuestas tendrán exactamente la misma estructura.

Por ejemplo:

```json
{
  "status":404,
  "error":"NOT_FOUND",
  "message":"Autor con id 15 no encontrado",
  "path":"/autores/15",
  "timestamp":"2026-06-29T12:15:32"
}
```

Ahora el frontend siempre sabe qué propiedades esperar.

No importa qué excepción haya provocado el error.

---

## Implementando el GlobalExceptionHandler

Ya podemos crear la clase que centralizará todas las excepciones de la aplicación.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

}
```

A partir de este momento iremos añadiendo un método para cada tipo de excepción que queramos controlar.

Empezaremos por uno de los casos más habituales: un recurso que no existe.

### Recurso no encontrado (404)

Uno de los errores más frecuentes en cualquier API es solicitar un recurso que no existe.

Imaginemos que nuestro servicio busca un autor por su identificador.

```java
@Service
public class AutorService {

    public Autor findById(Long id) {

        return autorRepository.findById(id)
                .orElseThrow(() ->
                        new AutorNotFoundException(id));

    }

}
```

En lugar de devolver `null`, lanzamos una excepción específica.

```java
public class AutorNotFoundException extends RuntimeException {

    public AutorNotFoundException(Long id) {
        super("Autor con id " + id + " no encontrado");
    }

}
```

Ahora solo necesitamos indicar a Spring cómo debe responder cuando aparezca esa excepción.

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AutorNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleAutorNotFound(
            AutorNotFoundException ex,
            HttpServletRequest request
    ) {

        ErrorResponse response = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "NOT_FOUND",
                ex.getMessage(),
                request.getRequestURI(),
                LocalDateTime.now()
        );

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(response);

    }

}
```

Si ahora un cliente solicita un autor inexistente:

```http
GET /autores/99
```

La respuesta será consistente.

```json
{
  "status":404,
  "error":"NOT_FOUND",
  "message":"Autor con id 99 no encontrado",
  "path":"/autores/99",
  "timestamp":"2026-06-29T12:45:13"
}
```

---

### Errores de validación (422)

Cuando utilizamos Bean Validation (`@Valid`), Spring lanza automáticamente una excepción de tipo `MethodArgumentNotValidException` si algún dato no cumple las restricciones definidas.

Por ejemplo:

```java
public record AutorRequest(

        @NotBlank
        String nombre,

        @Email
        String email

){}
```

Y en el controlador:

```java
@PostMapping
public Autor crear(@Valid @RequestBody AutorRequest request) {
    return autorService.crear(request);
}
```

Si el cliente envía:

```json
{
  "nombre":"",
  "email":"correo"
}
```

Spring lanzará una excepción antes incluso de entrar en el controlador.

Podemos capturarla así:

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ErrorResponse> handleValidation(
        MethodArgumentNotValidException ex,
        HttpServletRequest request
) {

    String errores = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .collect(Collectors.joining(", "));

    ErrorResponse response = new ErrorResponse(
            HttpStatus.UNPROCESSABLE_ENTITY.value(),
            "VALIDATION_ERROR",
            errores,
            request.getRequestURI(),
            LocalDateTime.now()
    );

    return ResponseEntity.unprocessableEntity()
            .body(response);

}
```

La respuesta tendrá un formato uniforme.

```json
{
  "status":422,
  "error":"VALIDATION_ERROR",
  "message":"nombre: no debe estar vacío, email: debe ser una dirección válida",
  "path":"/autores",
  "timestamp":"2026-06-29T13:10:45"
}
```

---

### Argumentos inválidos (400)

No todos los errores de entrada provienen de Bean Validation.

A veces somos nosotros quienes lanzamos una excepción.

```java
if (edad < 0) {
    throw new IllegalArgumentException("La edad no puede ser negativa");
}
```

Podemos capturarla fácilmente.

```java
@ExceptionHandler(IllegalArgumentException.class)
public ResponseEntity<ErrorResponse> handleBadRequest(
        IllegalArgumentException ex,
        HttpServletRequest request
) {

    ErrorResponse response = new ErrorResponse(
            400,
            "BAD_REQUEST",
            ex.getMessage(),
            request.getRequestURI(),
            LocalDateTime.now()
    );

    return ResponseEntity.badRequest().body(response);

}
```

---

### Acceso denegado (403)

Si utilizamos Spring Security, es habitual encontrarnos con `AccessDeniedException`.

```java
@ExceptionHandler(AccessDeniedException.class)
public ResponseEntity<ErrorResponse> handleForbidden(
        AccessDeniedException ex,
        HttpServletRequest request
) {

    ErrorResponse response = new ErrorResponse(
            403,
            "FORBIDDEN",
            "No tienes permisos para realizar esta acción.",
            request.getRequestURI(),
            LocalDateTime.now()
    );

    return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(response);

}
```

---

### Errores inesperados (500)

Aunque intentemos contemplar todos los casos posibles, siempre puede aparecer una excepción no prevista.

Por eso conviene terminar con un handler genérico.

```java
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handleException(
        Exception ex,
        HttpServletRequest request
) {

    log.error("Error inesperado", ex);

    ErrorResponse response = new ErrorResponse(
            500,
            "INTERNAL_SERVER_ERROR",
            "Ha ocurrido un error inesperado.",
            request.getRequestURI(),
            LocalDateTime.now()
    );

    return ResponseEntity.internalServerError()
            .body(response);

}
```

Observa que registramos el error completo en los logs, pero al cliente únicamente le devolvemos un mensaje genérico.

Nunca deberíamos exponer el stacktrace ni detalles internos de la aplicación.

---

## ProblemDetail

Desde Spring Framework 6 y Spring Boot 3 existe la clase `ProblemDetail`, basada en el estándar RFC 9457.

Permite devolver respuestas de error siguiendo un formato estandarizado.

```java
ProblemDetail problem =
        ProblemDetail.forStatus(HttpStatus.NOT_FOUND);

problem.setTitle("Autor no encontrado");
problem.setDetail(ex.getMessage());

return problem;
```

Es una buena opción cuando queremos seguir el estándar HTTP Problem Details.

Sin embargo, en muchos proyectos se sigue optando por un DTO propio como `ErrorResponse`.

¿Por qué?

Porque ofrece un control total sobre el formato de respuesta y facilita mantener compatibilidad con aplicaciones ya existentes.

---

## Buenas prácticas

- Centraliza siempre el manejo de excepciones.
- Evita escribir bloques `try/catch` en los controladores.
- Utiliza excepciones específicas para errores de negocio.
- No devuelvas nunca el stacktrace al cliente.
- Registra los errores completos únicamente en los logs.
- Mantén un formato único para todas las respuestas de error.
- Utiliza códigos HTTP acordes con el problema (`400`, `401`, `403`, `404`, `409`, `422` o `500`).

---

## Conclusión

Gestionar correctamente las excepciones es una parte fundamental del diseño de una API REST.

Centralizar esta responsabilidad mediante `@RestControllerAdvice` permite eliminar código repetido, ofrecer respuestas homogéneas y facilitar el trabajo tanto del backend como del frontend.

Además, mantener un único punto para el tratamiento de errores hace que la aplicación sea mucho más sencilla de mantener conforme crece.

Si estás empezando un proyecto con Spring Boot, incorporar un `GlobalExceptionHandler` desde el primer día es una decisión que probablemente agradecerás cuando la aplicación aumente en tamaño y complejidad.

---

## Bibliografía

- [Spring Docs — @ControllerAdvice](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/ControllerAdvice.html)
- [Baeldung — Exception Handling for REST with Spring](https://www.baeldung.com/exception-handling-for-rest-with-spring)
- [Baeldung - Problem Detail](https://www.baeldung.com/spring-boot-return-errors-problemdetail)