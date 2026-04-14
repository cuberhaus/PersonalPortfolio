---
name: Add Unit Tests for Web App & Fix Data Redundancy
overview: Fix the redundant attribute values (e.g. `director=Nolan`) returned by the domain layer, then add Spring Boot testing dependencies to the web module and create `@WebMvcTest` unit tests for the primary web controllers.
todos:
  - id: fix-redundant-attributes
    content: Fix the redundant toString() output in ValorAtribut subclasses
    status: completed
  - id: update-pom-tests
    content: Add spring-boot-starter-test to web/pom.xml
    status: completed
  - id: create-home-controller-test
    content: Create HomeControllerTest.java
    status: completed
  - id: create-tipusitem-controller-test
    content: Create TipusItemControllerTest.java
    status: completed
  - id: create-usuari-controller-test
    content: Create UsuariControllerTest.java
    status: completed
  - id: run-web-tests
    content: Run tests to verify they pass
    status: completed
isProject: false
---

# Fix Data Redundancy & Add Unit Tests

## 0. Fix Redundant Attribute Values

Currently, the domain layer returns values like `director=Nolan` instead of just `Nolan` when fetching items for the web frontend.
This happens because the subclasses of `ValorAtribut` likely prepend the attribute name to the value in their `toString()` implementations or when they are constructed.

- Investigate and fix the `ValorAtribut` subclasses (or how they are instantiated) in `FONTS/domini/classes/atributs/valors/` so that `toString()` returns only the clean value (e.g. `Nolan`).

## 1. Add Test Dependencies to Maven

First, we need to update the `pom.xml` file to include the Spring Boot test starter, which provides JUnit Jupiter, Mockito, and Spring Test context features.

- Edit `/home/pol/cuberhaus/subgrup-prop7.1/web/pom.xml`
- Add `<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>`

## 2. Set Up the Test Directory Structure

We will create the standard Maven test directory structure:
`web/src/test/java/web/controllers/`

## 3. Create Unit Tests for Controllers

We will write test classes for the main controllers. Each test class will use `@WebMvcTest` to only load the web layer, and `@MockBean` to provide a mock implementation of `ControladorDomini`.

### `HomeControllerTest.java`

- **Goal:** Verify the dashboard loads correctly and populates the model with summary statistics.
- **Tests:**
  - Mock `domini.obtenirNomsTipusItemsCarregats()`, `domini.obtenirUsuaris()`, etc.
  - Verify `mockMvc.perform(get("/"))` returns HTTP 200, uses the `home` view, and contains expected model attributes.

### `TipusItemControllerTest.java`

- **Goal:** Verify that the TipusItem management endpoints handle requests correctly and manage redirects and flash attributes.
- **Tests:**
  - Test `GET /tipus-item` to ensure it populates the model with the active and available types.
  - Test `POST /tipus-item/seleccionar` to ensure it calls `domini.seleccionarTipusItem()` and redirects with a success flash attribute.
  - Test `POST /tipus-item/seleccionar` with a simulated error to ensure it redirects with an error flash attribute.

### `UsuariControllerTest.java` (and others)

- **Goal:** Verify login/logout and user management flows.
- **Tests:**
  - Test `POST /usuari/login` simulating a successful and failed login.
  - Verify appropriate redirect paths and session state modifications.

## 4. Verify Test Execution

After implementing the tests, we will run `./mvnw test` within the `web` directory to confirm that all unit tests pass successfully.