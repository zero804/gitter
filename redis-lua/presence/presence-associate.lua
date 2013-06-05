local key_socket_user = KEYS[1];
local key_active_users = KEYS[2];
local key_active_sockets = KEYS[3];

local user_id = ARGV[1];
local socket_id = ARGV[2];

local lock_socket_user = redis.call("SETNX", key_socket_user, user_id)

if lock_socket_user == 0 then
	return { 0 }
end

local user_socket_count = redis.call("ZINCRBY", key_active_users, 1, user_id)
local socket_add_result = redis.call("SADD", key_active_sockets, socket_id)

return { lock_socket_user, user_socket_count, socket_add_result }
