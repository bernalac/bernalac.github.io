---
title: "Apache Maven 4: novedades y cómo migrar desde Maven 3"
description: "Repasamos las principales novedades de Maven 4, los cambios en el modelo POM y qué debemos revisar antes de migrar nuestros proyectos Java."
category: "java"
tags:
  [
    "java",
    "maven",
    "maven4",
    "maven3",
    "build-tools",
    "buenas-practicas",
    "gestor-dependencias",
  ]
author: "bernalac"
cover: "./images/apache-maven-4.webp"
date: 2026-10-19
updatedAt: 2026-10-19
draft: false
robots: true
---

`Maven` lleva años siendo una **herramienta** imprescindible en el desarrollo Java. Nos permite gestionar dependencias, ejecutar pruebas y generar artefactos sin tener que definir manualmente cada paso de la construcción.

Con **`Maven 4`**, el proyecto da un paso importante para adaptarse a las necesidades actuales: proyectos con muchos módulos, configuraciones más complejas y procesos de integración continua que necesitan ser cada vez más fiables.

No es una versión que obligue a rehacer todos nuestros proyectos, pero sí introduce cambios interesantes en la forma de organizar módulos, gestionar dependencias y publicar bibliotecas.

En este artículo veremos las novedades más importantes y qué debemos tener en cuenta antes de migrar desde `Maven 3`.

### Índice

1. [Java 17 como requisito mínimo](#java-17-como-requisito-mínimo)
2. [El nuevo modelo POM 4.1.0](#el-nuevo-modelo-pom-410)
3. [Consumer POM: una mejora para las bibliotecas](#consumer-pom-una-mejora-para-las-bibliotecas)
4. [Mejoras en proyectos multiproyecto](#mejoras-en-proyectos-multiproyecto)
5. [Dependencias y ciclo de vida](#dependencias-y-ciclo-de-vida)
6. [Seguridad y resolución de dependencias](#seguridad-y-resolución-de-dependencias)
7. [Cómo migrar desde Maven 3](#cómo-migrar-desde-maven-3)
8. [Buenas prácticas](#buenas-prácticas)
9. [Conclusión](#conclusión)

---

## Java 17 como requisito mínimo

Uno de los cambios más importantes es que `Maven 4` necesita **Java 17** o superior para ejecutarse.

Esto no significa que nuestras aplicaciones tengan que compilarse necesariamente para `Java 17`. La versión que ejecuta `Maven` y la versión objetivo de nuestro proyecto son cosas diferentes.

Por ejemplo, podemos ejecutar `Maven` con `Java 21` y seguir generando una aplicación compatible con `Java 11`, siempre que configuremos correctamente el compilador y las herramientas utilizadas.

```xml
<properties>
    <maven.compiler.release>11</maven.compiler.release>
</properties>
```

Por tanto, antes de migrar conviene revisar tanto la versión del `JDK` utilizada en desarrollo como la disponible en los agentes de integración continua.

## El nuevo modelo POM 4.1.0

El archivo `pom.xml` sigue siendo el centro de la configuración de `Maven`, pero la versión 4 introduce un nuevo modelo: `POM 4.1.0`.

Este modelo permite expresar nuevas configuraciones y simplificar determinadas relaciones entre proyectos, especialmente en repositorios con varios módulos.

Un ejemplo básico sería:

```xml
<project
    xmlns="http://maven.apache.org/POM/4.1.0"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="
        http://maven.apache.org/POM/4.1.0
        https://maven.apache.org/xsd/maven-4.1.0.xsd">

    <modelVersion>4.1.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>mi-aplicacion</artifactId>
    <version>1.0.0</version>
</project>
```

La buena noticia es que no necesitamos actualizar todos nuestros `POM` a `4.1.0` para empezar a utilizar `Maven 4`. Podemos mantener el modelo `4.0.0` mientras comprobamos la compatibilidad del proyecto y adoptar las nuevas funcionalidades más adelante.

## Consumer POM: una mejora para las bibliotecas

Una de las novedades más interesantes es el **Consumer POM**.

Cuando publicamos una biblioteca, su `pom.xml` puede contener información necesaria para construirla, pero que no aporta demasiado a los proyectos que la utilizan.

El **Consumer POM** permite generar una representación simplificada con la información que necesitan los consumidores para resolver las dependencias.

Esto ayuda a separar la configuración interna de construcción de los metadatos que reciben otros proyectos. También facilita la gestión de información heredada y de dependencias procedentes de `BOM`.

Es una mejora especialmente útil para equipos que mantienen bibliotecas compartidas o publican componentes utilizados por muchas aplicaciones.

Antes de activarla en un proyecto real, conviene comprobar que los consumidores siguen resolviendo correctamente todas las dependencias.

## Mejoras en proyectos multiproyecto

Los proyectos con varios módulos son habituales en aplicaciones empresariales:

```text
mi-aplicacion/
├── pom.xml
├── api/
├── servicio/
├── infraestructura/
└── aplicacion/
```

`Maven 4` mejora la organización de estos proyectos e introduce el concepto de subproyectos en el modelo `POM 4.1.0` mediante `<subprojects>`.

También permite descubrir determinados subproyectos automáticamente cuando se cumplen las condiciones necesarias, reduciendo la configuración repetitiva.

Otra mejora está relacionada con la ejecución de compilaciones y su reanudación cuando algún módulo falla.

En repositorios grandes, estos cambios pueden simplificar el mantenimiento y evitar trabajo innecesario. Aun así, conviene revisar las dependencias entre módulos y no asumir que todas las compilaciones serán más rápidas por el simple hecho de actualizar `Maven`.

## Dependencias y ciclo de vida

`Maven 4` incorpora cambios en la gestión de dependencias, especialmente en proyectos que utilizan el sistema de módulos de `Java`.

Entre las novedades encontramos tipos de artefactos que permiten distinguir mejor entre bibliotecas destinadas al `classpath`, bibliotecas modulares y procesadores de anotaciones.

Esto resulta útil en proyectos que utilizan `JPMS`, `Lombok` u otras herramientas de generación de código. No obstante, debemos comprobar la compatibilidad de los `plugins` antes de adoptar estos tipos en un proyecto existente.

También se moderniza el ciclo de vida de construcción. `Maven 4` incorpora nuevas posibilidades para coordinar tareas y ejecutar determinadas operaciones de forma concurrente.

Por ejemplo, en las versiones que lo admiten, podemos probar:

```bash
mvn -b concurrent verify
```

La ejecución concurrente puede ayudar en proyectos con muchos módulos, pero hay que medir los resultados y comprobar que los `plugins` y las tareas personalizadas no dependen de un orden de ejecución implícito.

Por otro lado, `Maven 4` mejora el soporte para variables de versión, como `${revision}`, y amplía las posibilidades de configuración de perfiles. Estas mejoras pueden reducir parte de la configuración repetitiva en proyectos complejos.

## Seguridad y resolución de dependencias

`Maven 4` también actualiza componentes internos importantes, entre ellos `Maven Artifact Resolver 2.0`.

Estas mejoras afectan a la resolución de dependencias y al acceso a repositorios. También se modernizan los mecanismos de gestión de credenciales mediante las herramientas de `Maven Encryption`.

Esto no elimina la necesidad de gestionar los secretos correctamente. Las contraseñas y los tokens deben mantenerse fuera del código fuente y utilizarse con los permisos mínimos necesarios.

Además, herramientas como `Maven Wrapper` siguen siendo especialmente útiles para que todos los desarrolladores y agentes de integración continua utilicen una versión controlada de `Maven`.

## Cómo migrar desde Maven 3

Migrar a `Maven 4` no debería consistir únicamente en cambiar la versión instalada. Lo recomendable es hacerlo por pasos.

### 1. Comprobar el entorno

Verifica las versiones instaladas:

```bash
java -version
mvn -version
```

Asegúrate de que `Maven 4` se ejecuta con `Java 17` o superior y revisa si el proyecto necesita seguir compilándose para una versión anterior de `Java`.

### 2. Revisar los plugins

Comprueba especialmente los `plugins` de compilación, pruebas, empaquetado, análisis y publicación.

Es recomendable fijar sus versiones explícitamente y verificar que son compatibles con `Maven 4`.

### 3. Mantener inicialmente el POM actual

No hace falta migrar inmediatamente todos los archivos al modelo `4.1.0`. Primero podemos comprobar si el proyecto funciona con `Maven 4` manteniendo la configuración existente.

Así resulta más sencillo identificar posibles incompatibilidades.

### 4. Ejecutar una construcción completa

Utiliza `Maven Wrapper` para probar la nueva versión:

```bash
./mvnw clean verify
```

Comprueba que pasan las pruebas y que los artefactos generados contienen lo esperado. Si publicas bibliotecas, valida también los procesos de instalación y despliegue.

### 5. Adoptar las novedades progresivamente

Cuando la migración básica esté validada, podemos introducir las funcionalidades que realmente aporten valor: **Consumer POM**, subproyectos, nuevos tipos de dependencias o ejecución concurrente.

No es necesario cambiarlo todo al mismo tiempo.

## Buenas prácticas

- Utiliza `Maven Wrapper` para fijar la versión de `Maven` del proyecto.
- Comprueba que el entorno dispone de `Java 17` o superior.
- No confundas la versión de `Java` que ejecuta `Maven` con la versión para la que compilas.
- Mantén actualizados los `plugins` y comprueba su compatibilidad.
- Conserva inicialmente el modelo `POM` existente si quieres reducir el riesgo de la migración.
- Prueba la publicación de bibliotecas antes de adoptar **Consumer POM**.
- Mide los tiempos de construcción antes y después de habilitar la concurrencia.
- Valida los `pipelines` de integración continua y los scripts de publicación.
- Comprueba el estado de la versión oficial antes de utilizarla en producción.

## Conclusión

`Maven 4` moderniza una herramienta fundamental del ecosistema `Java`. Sus principales novedades se centran en el modelo `POM`, los proyectos multiproyecto, la publicación de bibliotecas y la gestión de dependencias.

Lo más interesante es que podemos aprovechar estas mejoras sin tener que reescribir todos nuestros proyectos de golpe. La compatibilidad con el modelo `POM` anterior permite realizar una transición gradual y comprobar primero que nuestros `plugins` y procesos siguen funcionando correctamente.

Mi recomendación es empezar por una migración controlada, validar la construcción completa y adoptar después las nuevas funcionalidades según las necesidades del proyecto.

Como ocurre con cualquier actualización importante, la clave no está en utilizar todas las novedades desde el primer día, sino en aprovechar las que realmente simplifican nuestro trabajo.

## Bibliografía

- [Apache Maven — What's New in Maven 4](https://maven.apache.org/whatsnewinmaven4.html)
- [Baeldung — What's New in Maven 4](https://www.baeldung.com/maven-4-upgrades)
- [Apache Maven](https://maven.apache.org/)