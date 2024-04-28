---
sidebar_position: 4
---
# Transaction Management

## 1.4. Transaction management

To start a transaction in PostgreSQL you need to execute 'BEGIN' command.
'COMMIT' to apply changes and 'ROLLBACK' to revert. `Connection` class has `startTransaction()`, `commit()`
, `rollback()`,
`savepoint()`, `rollbackToSavepoint()` shorthand methods which is typed and more test friendly.

By default, PostgreSQL server executes SQL commands in auto-commit mode.
`postgresql-client` has a high-level implementation to manage this.
You can change this behaviour by setting `autoCommit` property to `false`.
After that all SQL scripts will be executed in transaction and
changes will not be applied until you call `commit()` or execute `COMMIT` command.

You can also check transaction status with `connection.inTransaction` getter.