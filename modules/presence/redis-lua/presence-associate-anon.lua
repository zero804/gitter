local key_socket_user = KEYS[1];
local key_active_sockets = KEYS[2];
local key_user_sockets = KEYS[3];

local socket_id = ARGV[1];
local create_time = ARGV[2];
local mobile_connection = tonumber(ARGV[3]);
local client = ARGV[4];
local troupe_id = ARGV[5];

if redis.call("EXISTS", key_socket_user) == 1 then
	return { 0 }
end

redis.call("HSET", key_socket_user, "ctime", create_time)
redis.call("HSET", key_socket_user, "ct", client)
redis.call("HSET", key_socket_user, "tid", troupe_id)

-- For mobile users, add them to the mobile users collection
if mobile_connection == 1 then
	redis.call("HSET", key_socket_user, "mob", 1)
end

redis.call("SADD", key_user_sockets, socket_id)
local socket_add_result = redis.call("SADD", key_active_sockets, socket_id)

return { 1, socket_add_result }
