#!/bin/sh
# Jalan aplikasi siswa Bilik dengan alamat database cloud.
# Cara pakai: ./run-dev.sh  (dari folder apps/mobile)
exec flutter run \
  --dart-define=SUPABASE_URL=https://hvjhdxfdctzzfcogjlcq.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2amhkeGZkY3R6emZjb2dqbGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3OTc5MDMsImV4cCI6MjEwNzM3MzkwM30.Nx1Hk9uF_E4qtyilELPm5RRXWfDRpw6Oz1LGGoaln24
