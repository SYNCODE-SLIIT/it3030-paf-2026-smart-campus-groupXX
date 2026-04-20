-- Booking System Enhancement Migrations
-- These migrations add support for recurring bookings, booking modifications, check-in tracking, and notifications

-- 1. Create recurring_bookings table
CREATE TABLE IF NOT EXISTS recurring_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    recurrence_pattern VARCHAR(50) NOT NULL, -- DAILY, WEEKLY, BIWEEKLY, MONTHLY
    start_date DATE NOT NULL,
    end_date DATE,
    occurrence_count INTEGER,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID NOT NULL,
    CONSTRAINT check_end_after_start CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT check_pattern_valid CHECK (recurrence_pattern IN ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY')),
    CONSTRAINT check_occurrence_positive CHECK (occurrence_count IS NULL OR occurrence_count > 0)
);

CREATE INDEX idx_recurring_bookings_resource_id ON recurring_bookings(resource_id);
CREATE INDEX idx_recurring_bookings_created_by ON recurring_bookings(created_by);
CREATE INDEX idx_recurring_bookings_active ON recurring_bookings(active);

-- 2. Create booking_modifications table
CREATE TABLE IF NOT EXISTS booking_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    requested_start_time TIMESTAMP NOT NULL,
    requested_end_time TIMESTAMP NOT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    rejection_reason TEXT,
    requested_by UUID NOT NULL,
    approved_by UUID,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_modification_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT check_modification_end_after_start CHECK (requested_end_time > requested_start_time)
);

CREATE INDEX idx_booking_modifications_booking_id ON booking_modifications(booking_id);
CREATE INDEX idx_booking_modifications_status ON booking_modifications(status);
CREATE INDEX idx_booking_modifications_requested_by ON booking_modifications(requested_by);
CREATE INDEX idx_booking_modifications_approved_by ON booking_modifications(approved_by);

-- 3. Create booking_notifications table
CREATE TABLE IF NOT EXISTS booking_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- APPROVAL, REJECTION, CANCELLATION, MODIFICATION_APPROVED, MODIFICATION_REJECTED, CHECK_IN_REMINDER, BOOKING_COMPLETED
    message TEXT NOT NULL,
    read_at TIMESTAMP,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_notification_type CHECK (notification_type IN ('APPROVAL', 'REJECTION', 'CANCELLATION', 'MODIFICATION_APPROVED', 'MODIFICATION_REJECTED', 'CHECK_IN_REMINDER', 'BOOKING_COMPLETED'))
);

CREATE INDEX idx_booking_notifications_user_id ON booking_notifications(user_id);
CREATE INDEX idx_booking_notifications_booking_id ON booking_notifications(booking_id);
CREATE INDEX idx_booking_notifications_created_at ON booking_notifications(created_at);
CREATE INDEX idx_booking_notifications_read_at ON booking_notifications(read_at);

-- 4. Alter bookings table to add new columns for recurring bookings and check-in
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS recurring_booking_id UUID REFERENCES recurring_bookings(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS check_in_status VARCHAR(50), -- PENDING, CHECKED_IN, COMPLETED, NO_SHOW
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP,
ADD CONSTRAINT check_check_in_status CHECK (check_in_status IS NULL OR check_in_status IN ('PENDING', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW'));

CREATE INDEX IF NOT EXISTS idx_bookings_recurring_booking_id ON bookings(recurring_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in_status ON bookings(check_in_status);

-- 5. Update booking status enum to include new statuses (if using enum type)
-- Note: This depends on your database schema. If using VARCHAR with constraints:
-- ALTER TABLE bookings DROP CONSTRAINT check_booking_status;
-- ALTER TABLE bookings ADD CONSTRAINT check_booking_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW'));

-- 6. Create function to mark notifications as read in bulk
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
    p_notification_ids UUID[]
)
RETURNS TABLE(id UUID, read_at TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    UPDATE booking_notifications
    SET read_at = CURRENT_TIMESTAMP
    WHERE id = ANY(p_notification_ids) AND read_at IS NULL
    RETURNING booking_notifications.id, booking_notifications.read_at;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM booking_notifications
    WHERE user_id = p_user_id AND read_at IS NULL;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Create function to generate child bookings from recurring pattern
-- This is a PostgreSQL helper function; main logic should be in Java service
CREATE OR REPLACE FUNCTION generate_recurring_booking_instances(
    p_recurring_id UUID
)
RETURNS TABLE(start_time TIMESTAMP, end_time TIMESTAMP) AS $$
DECLARE
    v_recurring recurring_bookings%ROWTYPE;
    v_current_date DATE;
    v_count INTEGER := 0;
BEGIN
    SELECT * INTO v_recurring FROM recurring_bookings WHERE id = p_recurring_id;

    IF v_recurring IS NULL THEN
        RETURN;
    END IF;

    v_current_date := v_recurring.start_date;

    WHILE v_current_date <= COALESCE(v_recurring.end_date, CURRENT_DATE + INTERVAL '2 years')
        AND (v_recurring.occurrence_count IS NULL OR v_count < v_recurring.occurrence_count)
    LOOP
        RETURN QUERY SELECT
            v_current_date::TIMESTAMP + v_recurring.start_time::TIME,
            v_current_date::TIMESTAMP + v_recurring.end_time::TIME;

        v_count := v_count + 1;

        -- Increment date based on pattern
        v_current_date := CASE v_recurring.recurrence_pattern
            WHEN 'DAILY' THEN v_current_date + INTERVAL '1 day'
            WHEN 'WEEKLY' THEN v_current_date + INTERVAL '7 days'
            WHEN 'BIWEEKLY' THEN v_current_date + INTERVAL '14 days'
            WHEN 'MONTHLY' THEN v_current_date + INTERVAL '1 month'
            ELSE v_current_date + INTERVAL '1 day'
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Summary of changes:
-- - recurring_bookings: Stores recurring booking patterns and configuration
-- - booking_modifications: Tracks modification requests with approval workflow
-- - booking_notifications: Stores all booking-related notifications
-- - bookings table: Added recurring_booking_id, check_in_status, checked_in_at columns
-- - Helper functions for notification management and recurring booking generation
