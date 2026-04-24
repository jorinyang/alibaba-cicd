-- 阿里云PolarDB PostgreSQL 数据库初始化脚本
-- 适用于 workshop-grouping 项目

-- 创建学员表
CREATE TABLE IF NOT EXISTS participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_name TEXT NOT NULL,
    first_choice TEXT NOT NULL,
    second_choice TEXT NOT NULL,
    group_id INTEGER,
    registration_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建场景组表
CREATE TABLE IF NOT EXISTS groups (
    id SERIAL PRIMARY KEY,
    group_name TEXT NOT NULL UNIQUE,
    max_capacity INTEGER DEFAULT 10,
    current_count INTEGER DEFAULT 0
);

-- 初始化10个场景组
INSERT INTO groups (group_name, max_capacity, current_count) VALUES
    ('线下销售', 10, 0),
    ('线上销售', 10, 0),
    ('行政管理', 10, 0),
    ('客户服务', 10, 0),
    ('制造管理', 10, 0),
    ('财务管理', 10, 0),
    ('人力资源', 10, 0),
    ('项目管理', 10, 0),
    ('经营分析', 10, 0),
    ('生产管理', 10, 0)
ON CONFLICT (group_name) DO NOTHING;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_participants_group_id ON participants(group_id);
CREATE INDEX IF NOT EXISTS idx_participants_first_choice ON participants(first_choice);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_group_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- 重新计算所有分组的当前人数
    UPDATE groups g
    SET current_count = (
        SELECT COUNT(*) FROM participants p WHERE p.group_id = g.id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_counts ON participants;
CREATE TRIGGER trigger_update_counts
    AFTER INSERT OR UPDATE OR DELETE ON participants
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_group_counts();
