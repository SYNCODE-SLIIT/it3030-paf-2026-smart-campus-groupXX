CREATE TABLE IF NOT EXISTS public.contact_messages (
    id UUID PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(50),
    title VARCHAR(300) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
    ON public.contact_messages (created_at DESC);
