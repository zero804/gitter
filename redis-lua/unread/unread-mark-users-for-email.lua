local email_hash_key = KEYS[1]

-- Values are lrt timestamp, troupeId followed by itemIds,
local date_ms = table.remove(ARGV, 1)
local troupe_userIds = ARGV

for i, troupe_user_id in ipairs(troupe_userIds) do
	redis.call("HSETNX", email_hash_key, troupe_user_id, date_ms)
end


