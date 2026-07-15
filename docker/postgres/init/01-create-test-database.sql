SELECT 'CREATE DATABASE yuansu_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'yuansu_test')\gexec
