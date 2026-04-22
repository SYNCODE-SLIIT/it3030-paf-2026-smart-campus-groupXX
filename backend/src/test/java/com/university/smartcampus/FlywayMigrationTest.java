package com.university.smartcampus;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class FlywayMigrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void createsAllUserManagementTables() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                                  select count(*)
                                  from information_schema.tables
                                  where table_schema = 'public'
                        and table_name in ('users', 'students', 'faculty', 'admins', 'managers', 'resources', 'admin_audit_logs')
                                  """,
                Integer.class);

        assertThat(tableCount).isEqualTo(7);
    }

    @Test
    void createsEnumBackedProfileColumnsAndRemovesOldColumns() {
        String userType = columnType("users", "user_type");
        String accountStatus = columnType("users", "account_status");
        String facultyName = columnType("students", "faculty_name");
        String programName = columnType("students", "program_name");
        String academicYear = columnType("students", "academic_year");
        String semester = columnType("students", "semester");
        String managerRole = columnType("managers", "manager_role");

        assertThat(userType).isEqualTo("user_type_enum");
        assertThat(accountStatus).isEqualTo("account_status_enum");
        assertThat(facultyName).isEqualTo("student_faculty_enum");
        assertThat(programName).isEqualTo("student_program_enum");
        assertThat(academicYear).isEqualTo("student_academic_year_enum");
        assertThat(semester).isEqualTo("student_semester_enum");
        assertThat(managerRole).isEqualTo("manager_role_enum");

        Integer removedColumnCount = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.columns
                        where table_schema = 'public'
                          and (
                            (table_name = 'admins' and column_name in ('first_name', 'last_name', 'preferred_name', 'department', 'job_title', 'office_phone'))
                            or (table_name = 'faculty' and column_name in ('office_location', 'office_phone'))
                            or (table_name = 'managers' and column_name in ('department', 'job_title', 'office_location', 'manager_roles'))
                          )
                        """,
                Integer.class);

        assertThat(removedColumnCount).isZero();
        assertThat(columnType("admins", "full_name")).isEqualTo("varchar");
    }

    @Test
    void createsAdminAuditLogEnumAndColumns() {
        assertThat(columnType("admin_audit_logs", "action")).isEqualTo("admin_action_enum");
        assertThat(columnType("admin_audit_logs", "performed_by_id")).isEqualTo("uuid");
        assertThat(columnType("admin_audit_logs", "target_user_id")).isEqualTo("uuid");
        assertThat(columnType("admin_audit_logs", "details")).isEqualTo("text");
        assertThat(columnType("admin_audit_logs", "created_at")).isEqualTo("timestamptz");
    }

    @Test
    void linksTicketsToResourcesAndLocationsWithNullableForeignKeys() {
        Integer constraintCount = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from pg_constraint
                        where connamespace = 'public'::regnamespace
                          and conrelid = 'public.tickets'::regclass
                          and conname in ('tickets_resource_id_fkey', 'tickets_location_id_fkey')
                          and confdeltype = 'n'
                        """,
                Integer.class);

        assertThat(constraintCount).isEqualTo(2);
        assertThat(isNullable("tickets", "resource_id")).isTrue();
        assertThat(isNullable("tickets", "location_id")).isTrue();
    }

    @Test
    void createsUnifiedNotificationTablesAndRetiresLegacyBookingNotifications() {
        Integer tableCount = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.tables
                        where table_schema = 'public'
                          and table_name in (
                            'notification_events',
                            'notification_recipients',
                            'notification_event_links',
                            'notification_preferences',
                            'notification_delivery_attempts'
                          )
                        """,
                Integer.class);

        assertThat(tableCount).isEqualTo(5);
        assertThat(tableExists("booking_notifications")).isFalse();
        assertThat(columnType("notification_recipients", "read_at")).isEqualTo("timestamptz");
        assertThat(columnType("notification_delivery_attempts", "status")).isEqualTo("varchar");

        Integer constraintCount = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from pg_constraint
                        where connamespace = 'public'::regnamespace
                          and conrelid in (
                            'public.notification_event_links'::regclass,
                            'public.notification_recipients'::regclass
                          )
                          and conname in (
                            'chk_notification_event_links_one_target',
                            'uq_notification_recipients_event_user'
                          )
                        """,
                Integer.class);

        assertThat(constraintCount).isEqualTo(2);
    }

    private String columnType(String tableName, String columnName) {
        return jdbcTemplate.queryForObject(
                """
                        select udt_name
                        from information_schema.columns
                        where table_schema = 'public'
                          and table_name = ?
                          and column_name = ?
                        """,
                String.class,
                tableName,
                columnName);
    }

    private boolean isNullable(String tableName, String columnName) {
        String nullable = jdbcTemplate.queryForObject(
                """
                        select is_nullable
                        from information_schema.columns
                        where table_schema = 'public'
                          and table_name = ?
                          and column_name = ?
                        """,
                String.class,
                tableName,
                columnName);
        return "YES".equals(nullable);
    }

    private boolean tableExists(String tableName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from information_schema.tables
                        where table_schema = 'public'
                          and table_name = ?
                        """,
                Integer.class,
                tableName);
        return count != null && count > 0;
    }
}
