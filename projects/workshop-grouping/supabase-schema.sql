-- 工作坊分组系统数据库表结构
-- 在Supabase SQL Editor中执行此脚本

-- 1. 创建或更新学员意向表
CREATE TABLE IF NOT EXISTS workshop_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  first_choice VARCHAR(50) NOT NULL,
  second_choice VARCHAR(50) NOT NULL,
  group_id INTEGER,
  device_id VARCHAR(100) NOT NULL,
  is_auto_assigned BOOLEAN DEFAULT FALSE,
  registration_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  update_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建或更新场景组配置表
CREATE TABLE IF NOT EXISTS scenario_groups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(50) NOT NULL UNIQUE,
  max_capacity INTEGER DEFAULT 10,
  current_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建或更新分组会话表
CREATE TABLE IF NOT EXISTS workshop_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name VARCHAR(100) NOT NULL,
  total_participants INTEGER DEFAULT 100,
  max_per_group INTEGER DEFAULT 10,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 迁移脚本：添加缺失的列（如果表已存在）
DO $$
BEGIN
  -- 为 workshop_participants 添加新列
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workshop_participants' AND column_name = 'device_id') THEN
    ALTER TABLE workshop_participants ADD COLUMN device_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workshop_participants' AND column_name = 'phone') THEN
    ALTER TABLE workshop_participants ADD COLUMN phone VARCHAR(20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workshop_participants' AND column_name = 'is_auto_assigned') THEN
    ALTER TABLE workshop_participants ADD COLUMN is_auto_assigned BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workshop_participants' AND column_name = 'update_time') THEN
    ALTER TABLE workshop_participants ADD COLUMN update_time TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 插入10个场景组（如果不存在）
INSERT INTO scenario_groups (group_name, max_capacity, current_count) VALUES
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

-- 插入默认会话配置（如果不存在）
INSERT INTO workshop_sessions (session_name, total_participants, max_per_group) VALUES
  ('武汉工作坊', 100, 10)
ON CONFLICT DO NOTHING;

-- 启用RLS
ALTER TABLE workshop_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_sessions ENABLE ROW LEVEL SECURITY;

-- 删除旧策略（如果存在）并创建新策略
DROP POLICY IF EXISTS "Allow public inserts on workshop_participants" ON workshop_participants;
DROP POLICY IF EXISTS "Allow public reads on workshop_participants" ON workshop_participants;
DROP POLICY IF EXISTS "Allow public updates on workshop_participants" ON workshop_participants;
DROP POLICY IF EXISTS "Allow public deletes on workshop_participants" ON workshop_participants;
DROP POLICY IF EXISTS "Allow public reads on scenario_groups" ON scenario_groups;
DROP POLICY IF EXISTS "Allow public updates on scenario_groups" ON scenario_groups;
DROP POLICY IF EXISTS "Allow public reads on workshop_sessions" ON workshop_sessions;
DROP POLICY IF EXISTS "Allow public updates on workshop_sessions" ON workshop_sessions;

-- workshop_participants 策略
CREATE POLICY "Allow public inserts on workshop_participants"
  ON workshop_participants FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public reads on workshop_participants"
  ON workshop_participants FOR SELECT USING (true);

CREATE POLICY "Allow public updates on workshop_participants"
  ON workshop_participants FOR UPDATE USING (true);

CREATE POLICY "Allow public deletes on workshop_participants"
  ON workshop_participants FOR DELETE USING (true);

-- scenario_groups 策略
CREATE POLICY "Allow public reads on scenario_groups"
  ON scenario_groups FOR SELECT USING (true);

CREATE POLICY "Allow public updates on scenario_groups"
  ON scenario_groups FOR UPDATE USING (true);

-- workshop_sessions 策略
CREATE POLICY "Allow public reads on workshop_sessions"
  ON workshop_sessions FOR SELECT USING (true);

CREATE POLICY "Allow public updates on workshop_sessions"
  ON workshop_sessions FOR UPDATE USING (true);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_device_id ON workshop_participants(device_id);

-- 创建分组结果视图
CREATE OR REPLACE VIEW group_results AS
SELECT
  wp.id,
  wp.participant_name,
  wp.first_choice,
  wp.second_choice,
  sg.group_name AS assigned_group,
  wp.registration_time
FROM workshop_participants wp
LEFT JOIN scenario_groups sg ON wp.group_id = sg.id
ORDER BY sg.group_name, wp.registration_time;

-- 创建统计视图
CREATE OR REPLACE VIEW group_statistics AS
SELECT
  sg.group_name,
  sg.max_capacity,
  sg.current_count,
  sg.max_capacity - sg.current_count AS remaining_slots,
  CASE
    WHEN sg.current_count >= sg.max_capacity THEN '已满'
    WHEN sg.current_count >= sg.max_capacity * 0.8 THEN '紧张'
    ELSE '有位'
  END AS status
FROM scenario_groups sg
ORDER BY sg.current_count ASC;

-- 创建增加组别计数的函数
CREATE OR REPLACE FUNCTION increment_group_count(group_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE scenario_groups SET current_count = current_count + 1 WHERE id = group_id_param;
END;
$$ LANGUAGE plpgsql;

-- 创建减少组别计数的函数
CREATE OR REPLACE FUNCTION decrement_group_count(group_id_param INTEGER)
RETURNS void AS $$
BEGIN
  UPDATE scenario_groups SET current_count = GREATEST(0, current_count - 1) WHERE id = group_id_param;
END;
$$ LANGUAGE plpgsql;
