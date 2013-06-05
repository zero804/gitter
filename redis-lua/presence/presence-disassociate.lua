local key_socket_user = KEYS[1];
local key_active_users = KEYS[2];
local key_active_sockets = KEYS[3];
local key_socket_troupe = KEYS[4];

local user_id = ARGV[1];
local socket_id = ARGV[2];

local del_socket_user = redis.call("DEL", key_socket_user)

if del_socket_user == 0 then
	return { 0 }
end

-- Decrement the users score in active users
local user_socket_count = redis.call("ZINCRBY", key_active_users, -1, user_id)
redis.call("ZREMRANGEBYSCORE", key_active_users, '-inf', 0)

local socket_del_result = redis.call("SREM", key_active_sockets, socket_id)
local troupe_id = redis.call("GET", key_socket_troupe)
redis.call("DEL", key_socket_troupe)

return { del_socket_user, user_socket_count, socket_del_result, troupe_id }
