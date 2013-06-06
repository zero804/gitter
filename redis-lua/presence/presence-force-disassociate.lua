local key_socket = KEYS[1];
local key_active_sockets = KEYS[2];

local socket_id = ARGV[1];

redis.call("DEL", key_socket)
redis.call("SREM", key_active_sockets, socket_id)

return true
