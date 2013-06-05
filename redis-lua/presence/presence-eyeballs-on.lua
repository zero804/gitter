local key_socket = KEYS[1];
local key_troupe_users = KEYS[2];

local user_id = ARGV[1];

local eyeball_lock = redis.call("HSETNX", key_socket, "eb", 1)

if eyeball_lock == 0 then
	return { 0 }
end

local in_troupe_count = redis.call("ZINCRBY", key_troupe_users, 1, user_id)

return { eyeball_lock, in_troupe_count }
