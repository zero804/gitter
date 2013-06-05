local key_working_set = KEYS[1];
local key_working_output_set = KEYS[2];
local key_active_users = KEYS[2]

local user_ids = ARGV;

for i, name in ipairs(user_ids) do
	redis.call("ZADD", key_working_set, 0, user_ids[i])
end

redis.call("ZINTERSTORE", key_working_output_set, 2, key_active_users, key_working_set)
local online_user_ids = redis.call("ZRANGEBYSCORE", key_working_output_set, 1, '+inf')
redis.call("DEL", key_working_set, key_working_output_set)

return online_user_ids