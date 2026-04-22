import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateSmsLogTable1743800000000 implements MigrationInterface {
  name = "CreateSmsLogTable1743800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "sms_logs",
        columns: [
          {
            name: "id",
            type: "serial",
            isPrimary: true,
          },
          {
            name: "phone",
            type: "varchar",
            length: "20",
            isNullable: false,
          },
          {
            name: "type",
            type: "varchar",
            length: "30",
            isNullable: false,
          },
          {
            name: "status",
            type: "varchar",
            length: "20",
            isNullable: false,
          },
          {
            name: "eskiz_message_id",
            type: "varchar",
            length: "100",
            isNullable: true,
          },
          {
            name: "error_message",
            type: "text",
            isNullable: true,
          },
          {
            name: "is_local",
            type: "boolean",
            default: true,
          },
          {
            name: "created_at",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
          {
            name: "last_update_at",
            type: "timestamp",
            default: "now()",
            isNullable: false,
          },
        ],
      }),
    );

    await queryRunner.createIndex(
      "sms_logs",
      new TableIndex({
        name: "idx_sms_logs_phone",
        columnNames: ["phone"],
      }),
    );

    await queryRunner.createIndex(
      "sms_logs",
      new TableIndex({
        name: "idx_sms_logs_created_at",
        columnNames: ["created_at"],
      }),
    );

    console.log("SMS logs table created successfully");
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sms_logs_phone"`);
    await queryRunner.dropTable("sms_logs");
    console.log("SMS logs table dropped");
  }
}
