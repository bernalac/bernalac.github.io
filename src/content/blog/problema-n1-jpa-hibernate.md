---
title: "El problema N+1 en JPA/Hibernate y cómo resolverlo"
description: "El problema N+1 es un error común en JPA/Hibernate. En este artículo explico qué es, cómo detectarlo y cómo solucionarlo eficazmente."
slug: "problema-n1-jpa-hibernate"
category: "java"
tags: ["java", "jpa", "hibernate", "spring-boot", "rendimiento"]
author: "Javier Bernal"
cover: "./images/problema-n1-jpa-hibernate.webp"
date: 2026-06-16
updatedAt: 2026-06-24
draft: false
featured: true
robots: true
---

## ¿Qué es el problema N+1?

El problema N+1 ocurre cuando, al recuperar una lista de entidades, el ORM (como JPA/Hibernate) ejecuta una consulta adicional por cada elemento para cargar sus relaciones.

En lugar de realizar una única consulta eficiente, el sistema ejecuta:

- **1 query inicial** para obtener la lista principal  
- **N queries adicionales** para cargar relaciones de cada elemento  

Esto genera un patrón de acceso a base de datos ineficiente que puede degradar seriamente el rendimiento de la aplicación.

Este problema es especialmente común en aplicaciones con **lazy loading**, que es el comportamiento por defecto en JPA para relaciones `@OneToMany` y `@ManyToMany`.

---

### Ejemplo típico

```java
List<Autor> autores = autorRepository.findAll(); // 1 query

for (Autor autor : autores) {
    System.out.println(autor.getLibros().size()); // N queries
}
```
Si hay 50 autores:

- 1 query para autores  
- 50 queries para libros  

Total: 51 queries

---

## ¿Por qué ocurre?

El problema no es el ORM en sí, sino la combinación de:

- Lazy loading por defecto
- Acceso a relaciones dentro de bucles
- Falta de planificación de consultas

```java
@Entity
public class Autor {

    @Id
    @GeneratedValue
    private Long id;

    private String nombre;

    @OneToMany(mappedBy = "autor", fetch = FetchType.LAZY) // lazy por defecto
    private List<Libro> libros;
}
```

Hibernate no carga las relaciones hasta que se accede a ellas. Esto es eficiente en teoría, pero problemático cuando se itera sobre colecciones.

---


## Cómo detectarlo

### Logs de Hibernate

Activa el log de SQL en `application.properties`:

```properties
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

Si ves el mismo tipo de query repetido N veces, tienes un problema N+1.

También puedes usar herramientas como:

- [p6spy](https://github.com/p6spy/p6spy)
- [Hypersistence Optimizer](https://vladmihalcea.com/hypersistence-optimizer/)
- APMs como New Relic o Datadog


## Soluciones

### 1. JPQL con JOIN FETCH

La solución más directa: forzar la carga de la relación en la misma query.

```java
@Query("SELECT a FROM Autor a JOIN FETCH a.libros")
List<Autor> findAllWithLibros();
```

Hibernate generará un `JOIN` en SQL y traerá autores y libros en una sola consulta.

**Limitación:** no funciona bien con paginación. Si combinas `JOIN FETCH` con `Pageable`, Hibernate carga todos los registros en memoria y pagina en Java, lo cual puede ser peor.

### 2. @EntityGraph
`@EntityGraph` permite definir un plan de carga de entidades sin necesidad de escribir JOIN FETCH explícito en JPQL. 

De esta forma, indicamos qué relaciones deben cargarse junto con la entidad principal en una sola consulta, evitando el problema N+1 de forma declarativa.

A nivel conceptual, Hibernate puede generar una consulta equivalente a:

```sql
SELECT a.*, l.*
FROM autor a
LEFT JOIN libro l ON l.autor_id = a.id;
```

A diferencia de `JOIN FETCH`, `@EntityGraph` se integra de forma más natural con Spring Data JPA y suele ser más flexible en escenarios con paginación.

#### Uso básico

```java
@EntityGraph(attributePaths = {"libros"})
List<Autor> findAll();
```

En este caso, Spring Data JPA cargará la relación libros junto con cada Autor, evitando consultas adicionales al acceder a la colección.

#### Uso con consultas personalizadas

```java
@EntityGraph(attributePaths = {"libros"})
@Query("SELECT a FROM Autor a")
Page<Autor> findAllWithLibros(Pageable pageable);
```

### 3. @BatchSize

Cuando no quieres eager loading completo pero sí reducir el número de queries. Hibernate agrupa las cargas lazy en lotes:

```java
@OneToMany(mappedBy = "autor")
@BatchSize(size = 20)
private List<Libro> libros;
```

Con batch size de 20 y 50 autores, en vez de 50 queries tendrás 3 (50 / 20 redondeado arriba). No elimina el N+1 pero lo mitiga significativamente.

También puedes configurarlo globalmente en `application.properties`:

```properties
spring.jpa.properties.hibernate.default_batch_fetch_size=20
```

### 4. Projections o DTOs con JPQL

Si no necesitas la entidad completa, usar projections evita cargar relaciones innecesarias:

```java
@Query("SELECT new com.ejemplo.AutorDTO(a.id, a.nombre, COUNT(l)) " +
       "FROM Autor a LEFT JOIN a.libros l GROUP BY a.id, a.nombre")
List<AutorDTO> findAutoresConConteoLibros();
```

## ¿Cuál usar?

| Situación | Solución recomendada |
|---|---|
| Lista sin paginación | `JOIN FETCH` |
| Lista con paginación | `@EntityGraph` |
| Relación grande, acceso ocasional | `@BatchSize` |
| Solo necesitas datos parciales | DTO con JPQL |

## Conclusión

El problema N+1 es silencioso: la aplicación funciona correctamente pero escala muy mal. Con 10 registros no lo notas; con 1.000 puede inutilizar la base de datos. La clave es **activar los logs de SQL en desarrollo** y revisar cualquier bucle que acceda a relaciones de entidades cargadas previamente.

En Spring Boot, `@EntityGraph` suele ser la opción más equilibrada porque es declarativa, compatible con paginación y no requiere escribir JPQL a mano.

## Bibliografía

- [Arquitectura Java](https://www.arquitecturajava.com/n1-queries-y-sus-problemas/)
- [Baeldung](https://www.baeldung.com/spring-hibernate-n1-problem)