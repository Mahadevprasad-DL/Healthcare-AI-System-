/*
  # Healthcare AI System Database Schema

  ## Overview
  This migration creates the complete database schema for a Healthcare AI System with role-based access control.

  ## Tables Created
  
  1. **profiles**
     - Extends Supabase auth.users with additional profile information
     - `id` (uuid, references auth.users)
     - `full_name` (text)
     - `role` (text) - Values: 'villager', 'asha_worker', 'doctor', 'admin'
     - `phone_number` (text)
     - `village` (text)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  2. **cases**
     - Medical cases created by villagers
     - `id` (uuid, primary key)
     - `user_id` (uuid, references profiles)
     - `title` (text)
     - `description` (text)
     - `status` (text) - Values: 'pending', 'in_review', 'diagnosed', 'treatment', 'resolved'
     - `severity` (text) - Values: 'early', 'moderate', 'severe'
     - `image_url` (text)
     - `assigned_to` (uuid, references profiles) - ASHA worker or doctor
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

  3. **symptoms**
     - Symptoms associated with cases
     - `id` (uuid, primary key)
     - `case_id` (uuid, references cases)
     - `symptom_name` (text)
     - `severity` (text) - Values: 'mild', 'moderate', 'severe'
     - `duration_days` (integer)
     - `created_at` (timestamptz)

  4. **predictions**
     - AI predictions for cases
     - `id` (uuid, primary key)
     - `case_id` (uuid, references cases)
     - `disease_name` (text)
     - `confidence_score` (numeric)
     - `recommended_action` (text)
     - `created_at` (timestamptz)

  5. **case_updates**
     - Track progress and updates on cases
     - `id` (uuid, primary key)
     - `case_id` (uuid, references cases)
     - `updated_by` (uuid, references profiles)
     - `update_type` (text) - Values: 'note', 'diagnosis', 'escalation', 'treatment'
     - `content` (text)
     - `created_at` (timestamptz)

  6. **alerts**
     - Notifications for users
     - `id` (uuid, primary key)
     - `user_id` (uuid, references profiles)
     - `case_id` (uuid, references cases)
     - `alert_type` (text) - Values: 'new_case', 'escalation', 'diagnosis', 'update'
     - `message` (text)
     - `is_read` (boolean)
     - `created_at` (timestamptz)

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies created for each role with appropriate permissions
  - Users can only access data relevant to their role

  ## Important Notes
  - All tables use UUID primary keys
  - Timestamps use timestamptz for timezone awareness
  - Foreign key constraints ensure data integrity
  - Indexes added for performance on frequently queried columns
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('villager', 'asha_worker', 'doctor', 'admin')),
  phone_number text,
  village text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions to avoid recursive profile policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(target_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = target_role
  );
$$;

-- Create cases table
CREATE TABLE IF NOT EXISTS cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  emergency_score integer DEFAULT 0 CHECK (emergency_score >= 0 AND emergency_score <= 10),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'diagnosed', 'treatment', 'resolved')),
  severity text CHECK (severity IN ('early', 'moderate', 'severe')),
  image_url text,
  assigned_to uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

-- Create symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  symptom_name text NOT NULL,
  severity text CHECK (severity IN ('mild', 'moderate', 'severe')),
  duration_days integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;

-- Create emergency_assessments table to track urgency scores for each case
CREATE TABLE IF NOT EXISTS emergency_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  emergency_score integer NOT NULL CHECK (emergency_score >= 0 AND emergency_score <= 10),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'review', 'system')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE emergency_assessments ENABLE ROW LEVEL SECURITY;

-- Create case_images table for multiple uploaded or captured images per case
CREATE TABLE IF NOT EXISTS case_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  image_source text NOT NULL DEFAULT 'upload' CHECK (image_source IN ('upload', 'camera')),
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE case_images ENABLE ROW LEVEL SECURITY;

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  disease_name text NOT NULL,
  confidence_score numeric(5,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  recommended_action text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- Create case_updates table
CREATE TABLE IF NOT EXISTS case_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE NOT NULL,
  updated_by uuid REFERENCES profiles(id) NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('note', 'diagnosis', 'escalation', 'treatment')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE case_updates ENABLE ROW LEVEL SECURITY;

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('new_case', 'escalation', 'diagnosis', 'update')),
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_assigned_to ON cases(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_symptoms_case_id ON symptoms(case_id);
CREATE INDEX IF NOT EXISTS idx_emergency_assessments_case_id ON emergency_assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_case_images_case_id ON case_images(case_id);
CREATE INDEX IF NOT EXISTS idx_predictions_case_id ON predictions(case_id);
CREATE INDEX IF NOT EXISTS idx_case_updates_case_id ON case_updates(case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE UNIQUE INDEX IF NOT EXISTS idx_case_images_primary ON case_images(case_id) WHERE is_primary;

-- Row Level Security Policies

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "New users can insert their profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Cases policies
CREATE POLICY "Villagers can view own cases"
  ON cases FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    public.has_role('doctor') OR
    public.is_admin()
  );

CREATE POLICY "Villagers can create cases"
  ON cases FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    public.has_role('villager')
  );

CREATE POLICY "Villagers can update own cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Medical staff can update assigned cases"
  ON cases FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid() OR
    public.has_role('doctor') OR
    public.is_admin()
  )
  WITH CHECK (
    assigned_to = auth.uid() OR
    public.has_role('doctor') OR
    public.is_admin()
  );

-- Symptoms policies
CREATE POLICY "Users can view symptoms for accessible cases"
  ON symptoms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = symptoms.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Users can insert symptoms for own cases"
  ON symptoms FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = symptoms.case_id AND cases.user_id = auth.uid()
    )
  );

-- Emergency assessments policies
CREATE POLICY "Users can view emergency assessments for accessible cases"
  ON emergency_assessments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = emergency_assessments.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Users can insert emergency assessments for accessible cases"
  ON emergency_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = emergency_assessments.case_id AND cases.user_id = auth.uid()
    )
  );

-- Case images policies
CREATE POLICY "Users can view images for accessible cases"
  ON case_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_images.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Users can insert images for accessible cases"
  ON case_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_images.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Users can update images for accessible cases"
  ON case_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_images.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_images.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Users can delete images for accessible cases"
  ON case_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_images.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

-- Predictions policies
CREATE POLICY "Users can view predictions for accessible cases"
  ON predictions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = predictions.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "System can insert predictions"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Case updates policies
CREATE POLICY "Users can view updates for accessible cases"
  ON case_updates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_updates.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

CREATE POLICY "Authenticated users can create case updates"
  ON case_updates FOR INSERT
  TO authenticated
  WITH CHECK (
    updated_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM cases
      WHERE cases.id = case_updates.case_id AND (
        cases.user_id = auth.uid() OR
        cases.assigned_to = auth.uid() OR
        public.has_role('doctor') OR
        public.is_admin()
      )
    )
  );

-- Alerts policies
CREATE POLICY "Users can view own alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();