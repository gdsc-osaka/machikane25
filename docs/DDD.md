# DDD.md - Domain-Driven Design Guidelines
This document defines the core architectural philosophy, layered structure, and coding standards for this project. The Coding AI Agent is expected to strictly adhere to these guidelines at all times. The philosophy is to build a robust and maintainable application by placing the business domain at the center of the architecture.
For more details on specific coding practices, refer apps/example/src source files.

## 1. Core Philosophy: Domain-Centric
- **The Domain is the Heart:** All technical decisions serve to best model and express the business domain. The primary focus is on the logic and rules of the domain, not the technology (Firebase, Next.js).
- **Ubiquitous Language:** The code is a shared language. Types, functions, and variable names must directly correspond to the terminology used by domain experts. There should be no translation layer between the business language and the code's language.
- **Model-Driven Design:** The domain model is not just an analysis tool; it is the backbone of the implementation. The code directly reflects the structure, relationships, and rules of the domain model.

## 2. Architectural Layers
The application is strictly divided into four layers. Dependencies must only point inwards: Presentation depends on Application, Application depends on Domain, and Infrastructure depends on Domain.

### Layer 1: Presentation (Next.js / React)
- **Responsibility:** To display information to the user and interpret user commands. This layer contains all UI components (React Server/Client Components).
- **Rules:**
    - Contains no business logic.
    - It is concerned only with *how* to display things, not *what* to display.
    - It calls functions in the Application Layer in response to user events.
    - It should be possible to swap out the entire Presentation layer (e.g., from Next.js to a CLI) without any changes to the other layers.

### Layer 2: Application (Use Cases)
- **Responsibility:** To orchestrate the execution of business use cases. It coordinates fetching domain objects from the Infrastructure layer and tells them to perform their logic.
- **Rules:**
    - Contains no business logic itself. It acts as a thin coordinator.
    - It retrieves domain objects (Aggregates) from Repositories.
    - It calls methods on those domain objects to perform tasks.
    - It uses Repositories to persist the resulting state of the domain objects.
    - Example: An `addUserToTeam` application service would fetch the `Team` aggregate, call a method like `team.addMember(user)`, and then save the updated `Team` aggregate.

### Layer 3: Domain (The Core)
- **Responsibility:** To contain all business logic, rules, and state. This is the heart of the application.
- **Rules:**
    - Has **zero dependencies** on any other layer or external framework (Firebase, Next.js, etc.). It is pure TypeScript.
    - Contains Entities, Value Objects, Aggregates, and Domain Services that represent the business concepts.
    - Defines the interfaces for Repositories (e.g., `IUserRepository`), but does not contain their implementation.

### Layer 4: Infrastructure (Firebase, etc.)
- **Responsibility:** To handle all external concerns, such as database access, network calls, and third-party integrations.
- **Rules:**
    - Implements the Repository interfaces defined in the Domain Layer. This is where all Firebase Client SDK calls will live.
    - Handles the translation of data between the format required by the external tool (e.g., a Firestore document) and the domain model.
    - This layer depends on the Domain layer, adhering to the Dependency Inversion Principle.

## 3. Directory Structure
The directory structure MUST directly mirror the architectural layers to ensure a clear and organized codebase.
```
src
├── application/
│   └── user/
│       └── create-user.ts      # Application Layer: Orchestrates use cases.
├── domain/
│   └── user.ts              # Domain Layer: Core business logic, entities, value objects (defined with zod).
└── infrastructure/
    └── user/
        ├── user-converter.ts    # Infrastructure Layer: FirestoreDataConverter for the User domain object.
        └── user-repository.ts   # Infrastructure Layer: Implements the repository interface defined in the domain.
```

## 4. Key DDD Concepts & Implementation (Functional)
This project uses a functional approach. **Classes are strictly forbidden.** Use functions, interfaces, and object literals. Domain objects must be immutable.

### Entities & Value Objects
- **Entities:** Objects with a distinct identity that persists over time. Represented by a `zod` schema with an `id` field. Created via factory functions that use the schema's `parse` method to ensure validity.
- **Value Objects:** Objects without a conceptual identity, defined solely by their attributes (e.g., Money, DateRange). They must be immutable and are also defined with `zod`.

### Aggregates
- An Aggregate is a cluster of domain objects (Entities and Value Objects) that can be treated as a single unit. The **Aggregate Root** is the single entity within the aggregate that is referenced from the outside.
- All operations on the aggregate are performed through functions that take the Aggregate Root as an argument and return a new, updated instance, ensuring the integrity and business rules of the aggregate are enforced.
- Repositories operate only on Aggregate Roots.

### Repositories
- A Repository is a collection-like interface for accessing domain objects.
- The **interface** is defined in the Domain Layer.
    - *Domain Layer:* `interface IOrderRepository { findById(id: OrderId): Promise<Order>; save(order: Order): Promise<void>; } // throws domain errors on failure`
- The **implementation** resides in the Infrastructure Layer and uses the Firebase Client SDK.
    - *Infrastructure Layer:* `const orderRepository: IOrderRepository = { async findById(id) { /* ... getDoc logic ... */ }, /* ... */ };`

## 5. Strict Coding Standards & Prohibitions
### 【CRITICAL】 Domain Objects via Zod
All domain objects (Entities, Value Objects) **MUST be defined using `zod` schemas**. The TypeScript type should then be inferred from the schema. This provides a single source of truth for both static types and runtime validation.
- **Purpose:** This ensures that no invalid data can ever exist within the domain layer. All data coming from external sources (like Firestore or user input) must be parsed by the schema before being treated as a domain object.
- **Good:**
  ```typescript
  import { z } from 'zod';

  export const UserSchema = z.object({
    id: z.string().uuid().brand<'UserId'>(),
    name: z.string().min(1, { message: "Name cannot be empty" }),
  });

  export type User = z.infer<typeof UserSchema>;
  ```

### 【CRITICAL】 No Domain Logic Leakage
All business rules and logic MUST reside exclusively within the **Domain Layer**. No other layer should be aware of these rules.
- **Bad:** A React component checks `if (user.points > 100)` to show a "Premium" badge.
- **Good:** The domain has a function `isPremium(user: User): boolean`. The React component calls this function and renders based on the boolean result.

### 【CRITICAL】 Immutability & Functional Purity
Do not mutate objects. When a state change is required, create and return a new object with the updated values. This is especially true for Aggregates and Entities.
- **Bad:** `order.status = "SHIPPED";`
- **Good:** `const shippedOrder = shipOrder(order); // shipOrder returns a new order object`

### 【CRITICAL】 Explicit & Structured Error Handling
All operations that can fail must explicitly declare their failure cases in their function signature. Throw domain-specific errors for predictable failures and catch them at the call site.
- **Prefer `try/catDRch`:** Sequence potentially failing operations with `async/await` and wrap the orchestration in `try/catch` blocks. Convert low-level errors into domain errors before rethrowing.
- **Exhaustive handling:** When catching errors in the Presentation or Application layer, use `ts-pattern`'s `match` (or exhaustive `switch`) on an error's discriminant to ensure every case is handled.

## 6. Coding Conventions ✍️
### Functional Dependency Injection
All dependencies (database connections, other services, etc.) MUST be injected using higher-order functions (currying). This enables easy testing and composition.
- **Application Layer:** The main use case function is created by a factory that accepts all its dependencies.
  ```typescript
  // The factory function accepts dependencies
  export const registerCustomer = (
      runTransaction: RunTransaction,
      fetchDBStoreByPublicId: FetchDBStoreByPublicId,
      // ... other dependencies
  ): RegisterCustomer => 
  // It returns the actual use case function
  (storeId, image) => {
      // ... logic using dependencies
  };
  ```
- **Infrastructure Layer:** Repository functions accept the database transaction/connection as the first argument.
  ```typescript
    export const findDBCustomerById: FindDBCustomerById =
      (db) => // 1. Inject dependency
      async (id) => { // 2. Return the function that uses it
        try {
          return await readCustomerDocument(db, id);
        } catch (error) {
          throw mapToCustomerRepositoryError(error);
        }
      };
  ```

### Domain Layer Logic
- **Nominal Typing with Zod Brands:** Use `.brand<'TypeName'>()` on zod schemas for IDs and entities. This creates "branded types" that prevent misuse (e.g., passing a `StoreId` where a `CustomerId` is expected), even if they are both strings.
  ```typescript
  export const CustomerId = z.string().brand<"CUSTOMER_ID">();
  export type CustomerId = z.infer<typeof CustomerId>;
  ```
- **Business Rules as Pure Functions:** Business logic is implemented as small, pure functions that operate on domain objects and throw domain-specific errors when invariants are violated.
  ```typescript
  export const ensureTosNotAccepted = (customer: DBCustomer) => {
    if (customer.tosAcceptedAt !== null) {
      throw CustomerTosAlreadyAcceptedError("...", {
        extra: { customerId: customer.id },
      });
    }
    return customer;
  };
  ```
- **Custom Errors with `errorBuilder`:** Every business rule violation should have its own specific error type created with the `errorBuilder`. This allows for precise error handling in the application layer.

### Application & Infrastructure Layer Orchestration
- **Compose with `async/await`:** Combine asynchronous steps using ordinary control flow. Inside orchestration functions, wrap the sequence in `try/catch` and throw domain errors when validation fails.
- **Handle parallelism explicitly:** For independent asynchronous tasks, use `Promise.all` (wrapped in `try/catch`) so that shared error handling logic can surface the first thrown domain error.
  ```typescript
  // Example from the `registerCustomer` use case
  try {
    const [embedding, store] = await Promise.all([
      getFaceEmbedding(image), // Task 1
      fetchDBStoreByPublicId(db)(storeId),
    ]);
    const customer = createCustomer(store);
    // ... logic continues if both tasks succeed
    return customer;
  } catch (error) {
    // Translate infrastructure errors into domain errors before rethrowing
    throw mapToRegisterCustomerError(error);
  }
  ```
- **Handling Complexity:** For complex use cases with multiple branches or conditional logic, rely on `async/await` with nested helper functions. Use local `try/catch` blocks to translate low-level failures into the domain errors expected by callers.
