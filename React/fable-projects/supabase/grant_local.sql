-- ============================================================================
-- ローカル開発（supabase start）専用: public スキーマの権限付与
--
-- Supabase クラウドでは public スキーマのデフォルト権限により anon /
-- authenticated / service_role へのテーブル権限が自動で付与されるが、
-- ローカルスタックで psql（postgres ユーザー）からスキーマを適用した場合は
-- 付与されず、REST が「permission denied (42501)」になる。
-- schema.sql / schema_phase2.sql / schema_phase3.sql の適用後に本ファイルを
-- 実行すること（クラウドの SQL Editor 経由では不要）。
-- RLS は有効のままなので、権限を付与しても行の可視性はポリシーで制御される。
-- ============================================================================

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;
