
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const supabaseUrl = 'https://mzltyzkejuibyxrgpncc.supabase.co';
const supabaseKey = 'sb_publishable_tZmjuQXKKc8KyKsCyhiBtQ_OFlhlWgy';

export const supabase = createClient(supabaseUrl, supabaseKey);
