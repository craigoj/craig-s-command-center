-- Add new columns to intake_items for second brain classification
ALTER TABLE public.intake_items
ADD COLUMN confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
ADD COLUMN needs_review BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN auto_processed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN classified_category TEXT CHECK (classified_category IN ('task', 'project', 'person', 'learning', 'health', 'content', 'question'));

-- Add index on classified_category for filtering
CREATE INDEX idx_intake_items_classified_category ON public.intake_items(classified_category);

-- Add index on needs_review for queue filtering
CREATE INDEX idx_intake_items_needs_review ON public.intake_items(needs_review) WHERE needs_review = true;