-- 创建扩展（如果需要）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建表空间（可选）
-- CREATE TABLESPACE hotspot_ts LOCATION '/var/lib/postgresql/data/hotspot';