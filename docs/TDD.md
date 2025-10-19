# CLAUDE.md - Project Development Guidelines

This document defines the core development philosophy, process, and coding standards for this project. The Claude Code agent is expected to strictly adhere to these guidelines at all times. The philosophy is heavily inspired by the teachings of Takuya Wada (t-wada) on Test-Driven Development (TDD).

## 1. Core Philosophy: Test-Driven
- **Tests Drive Development:** All production code is written only to make a failing test pass. Tests are not an afterthought; they are the specification and the driver of design.
- **Confidence in Refactoring:** A comprehensive test suite is our safety net. It allows us to refactor and improve the codebase fearlessly and continuously.
- **Testability Equals Good Design:** If code is difficult to test, it is a sign of poor design. The agent must prioritize creating code that is easy to test, which naturally leads to a loosely coupled and highly cohesive architecture.

## 2. The Development Cycle: Red-Green-Refactor-Commit
The agent must follow this iterative cycle for every change, no matter how small. The agent should explicitly state which phase it is in when generating code.

### Phase 1: Red - Write a Failing Test
- **Goal:** To clearly define what needs to be accomplished.
- **Action:** Before writing any implementation code, create a concise, specific test that verifies a single piece of desired functionality.
- **Condition:** This test must fail (**RED**), as the corresponding implementation does not yet exist.

### Phase 2: Green - Make the Test Pass
- **Goal:** To fulfill the requirements defined by the test.
- **Action:** Write the absolute minimum amount of code necessary to make the failing test pass (**GREEN**).
- **Condition:** Do not add extra functionality. Elegance is not the goal at this stage; simply passing the test is.

### Phase 3: Refactor - Improve the Design
- **Goal:** To clean up the code while keeping all tests green.
- **Action:** With the safety of passing tests, improve the internal structure of the code. This includes, but is not limited to:
    - Removing duplication (DRY principle).
    - Improving names for clarity.
    - Simplifying complex logic.
    - Ensuring all coding standards listed below are met.
- **Condition:** All tests must remain **GREEN** throughout the refactoring process.

### Phase 4: Commit - Save the Progress
- **Goal:** To record a functioning, small unit of work as a secure checkpoint.
- **Action:** After refactoring is complete and a final check confirms all tests are green, execute `git add .` to stage the changes. This serves as a stable checkpoint before proceeding to the next development cycle.
- **Condition:** The changes implemented in this cycle should represent a single, meaningful unit of work. The commit message should also concisely describe this work.

## 3. Strict Coding Standards & Prohibitions

### 【CRITICAL】 No Hard-coding
Any form of hard-coded value is strictly forbidden.

- **Magic Numbers:** Do not use numeric literals directly in logic. Define them as named constants.
    - *Bad:* `if (age > 20)`
    - *Good:* `const ADULT_AGE = 20; if (age > ADULT_AGE)`
- **Configuration Values:** API keys, URLs, file paths, and other environmental settings MUST be loaded from configuration files (e.g., `.env`, `config.js`) or environment variables. They must never be present in the source code.
- **User-facing Strings:** Text for UI, logs, or errors should be managed via constants or localization files to facilitate maintenance and internationalization.

### Mocking and Stubbing
- Use mocking libraries (e.g., Vitest mocks) to simulate external dependencies in unit tests, such as infrastructure layers e.g. database access, network calls, or file I/O.

### Other Key Standards
- **Single Responsibility Principle (SRP):** Every module, class, or function should have responsibility over a single part of the functionality.
- **DRY (Don't Repeat Yourself):** Avoid code duplication at all costs. Abstract and reuse common logic.
- **Clear and Intentional Naming:** Variable and function names must clearly communicate their purpose and intent.
- **Guard Clauses / Early Return:** Prefer early returns to avoid deeply nested `if-else` structures.
- **Security First:** Always treat user input as untrusted. Sanitize inputs and encode outputs to prevent common vulnerabilities (XSS, SQL Injection, etc.).