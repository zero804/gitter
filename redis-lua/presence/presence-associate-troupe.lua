local key_socket_user = KEYS[1];
local key_user_lock = KEYS[2];

local troupe_id = ARGV[1];

local set_result = redis.call('HSETNX', key_socket_user, "tid", troupe_id);

if set_result == 1 then
	redis.call("INCR", key_user_lock);
	redis.call("EXPIRE", key_user_lock, 10);
end

return { set_result }
