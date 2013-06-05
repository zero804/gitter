local key_socket_eyeball_status = KEYS[1];
local key_troupe_users = KEYS[2];

local user_id = ARGV[1];

local eyeball_lock = redis.call("DEL", key_socket_eyeball_status)

if eyeball_lock == 0 then
	return { 0 }
end

local user_in_troupe_count = redis.call("ZINCRBY", key_troupe_users, -1, user_id)
redis.call("ZREMRANGEBYSCORE", key_troupe_users, '-inf', '0')

local total_in_troupe_count = redis.call("ZCARD", key_troupe_users)

return { eyeball_lock, user_in_troupe_count, total_in_troupe_count }
