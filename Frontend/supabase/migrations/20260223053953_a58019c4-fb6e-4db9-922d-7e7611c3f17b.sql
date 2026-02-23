
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'maintenance_staff');

-- User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Toilets table
CREATE TABLE public.toilets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_operational BOOLEAN NOT NULL DEFAULT true,
  water_available BOOLEAN NOT NULL DEFAULT true,
  cleanliness_score NUMERIC NOT NULL DEFAULT 100,
  cleanliness_grade TEXT NOT NULL DEFAULT 'A',
  total_inspections INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.toilets ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_toilets_cleanliness_score ON public.toilets(cleanliness_score);
CREATE INDEX idx_toilets_lat_lng ON public.toilets(latitude, longitude);

-- Toilet inspections table
CREATE TABLE public.toilet_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id UUID REFERENCES public.toilets(id) ON DELETE CASCADE NOT NULL,
  inspector_id UUID REFERENCES auth.users(id) NOT NULL,
  image_url TEXT,
  litter_count INTEGER NOT NULL DEFAULT 0,
  wet_floor_detected BOOLEAN NOT NULL DEFAULT false,
  overflow_detected BOOLEAN NOT NULL DEFAULT false,
  detection_json JSONB,
  calculated_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.toilet_inspections ENABLE ROW LEVEL SECURITY;

-- Toilet ratings table
CREATE TABLE public.toilet_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toilet_id UUID REFERENCES public.toilets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.toilet_ratings ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Cleanliness scoring function
CREATE OR REPLACE FUNCTION public.calculate_cleanliness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score NUMERIC;
  grade TEXT;
BEGIN
  score := 100 - (NEW.litter_count * 10);
  IF NEW.wet_floor_detected THEN score := score - 15; END IF;
  IF NEW.overflow_detected THEN score := score - 30; END IF;
  IF score < 0 THEN score := 0; END IF;
  
  NEW.calculated_score := score;

  IF score >= 90 THEN grade := 'A';
  ELSIF score >= 70 THEN grade := 'B';
  ELSIF score >= 50 THEN grade := 'C';
  ELSE grade := 'D';
  END IF;

  UPDATE public.toilets SET
    cleanliness_score = score,
    cleanliness_grade = grade,
    total_inspections = total_inspections + 1,
    last_updated = now()
  WHERE id = NEW.toilet_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calculate_cleanliness
BEFORE INSERT ON public.toilet_inspections
FOR EACH ROW
EXECUTE FUNCTION public.calculate_cleanliness();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- RLS POLICIES

-- Profiles: users can read all, update own
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles: admins can manage, users can read own
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Toilets: public read, admin full control
CREATE POLICY "Public can view toilets" ON public.toilets FOR SELECT USING (true);
CREATE POLICY "Admins can insert toilets" ON public.toilets FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update toilets" ON public.toilets FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete toilets" ON public.toilets FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Inspections: public read, authenticated insert
CREATE POLICY "Public can view inspections" ON public.toilet_inspections FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert inspections" ON public.toilet_inspections FOR INSERT WITH CHECK (auth.uid() = inspector_id);

-- Ratings: public read, authenticated insert
CREATE POLICY "Public can view ratings" ON public.toilet_ratings FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ratings" ON public.toilet_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage bucket for toilet images
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('toilet-images', 'toilet-images', true, 2097152);

CREATE POLICY "Public can view toilet images" ON storage.objects FOR SELECT USING (bucket_id = 'toilet-images');
CREATE POLICY "Authenticated users can upload toilet images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'toilet-images' AND auth.role() = 'authenticated');

-- Enable realtime for toilets and inspections
ALTER PUBLICATION supabase_realtime ADD TABLE public.toilets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.toilet_inspections;
