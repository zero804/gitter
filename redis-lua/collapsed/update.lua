local key_user_room = KEYS[1];

local time_now = ARGV[1];
local chat_id = ARGV[2];
local state = ARGV[3];

local MAX_ITEMS = 100 + 1

if state == "0" then
  redis.call("ZREM", key_user_room, chat_id);
else
  redis.call("ZADD", key_user_room, time_now, chat_id);
  redis.call("ZREMRANGEBYRANK", key_user_room, 0, -MAX_ITEMS);
end



