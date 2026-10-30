SELECT 'CREATE DATABASE complaints_dev' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'complaints_dev')\gexec
SELECT 'CREATE DATABASE complaints_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'complaints_test')\gexec
