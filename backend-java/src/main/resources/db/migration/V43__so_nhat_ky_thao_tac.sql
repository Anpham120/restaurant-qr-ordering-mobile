create table audit_log (
    id varchar(64) primary key,
    occurred_at timestamptz not null,
    actor_user_id varchar(64),
    actor_role varchar(32) not null,
    action varchar(64) not null,
    subject_type varchar(64) not null,
    subject_id varchar(128) not null,
    table_code varchar(16),
    amount numeric(19, 2),
    reason varchar(500),
    before_data jsonb,
    after_data jsonb,
    ip_address varchar(64)
);

create index ix_audit_log_occurred_at on audit_log (occurred_at desc);
create index ix_audit_log_subject on audit_log (subject_type, subject_id);
create index ix_audit_log_table_occurred_at on audit_log (table_code, occurred_at desc);
create index ix_audit_log_actor_occurred_at on audit_log (actor_user_id, occurred_at desc);
