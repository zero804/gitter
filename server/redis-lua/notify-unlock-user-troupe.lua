local primary_lock = KEYS[1];
local segment_lock = KEYS[2];

local notification_number = redis.call("GET", primary_lock)

if not notification_number then
	return 0
else
	local segment_start_time = redis.call("GET", segment_lock)
	redis.call("DEL", segment_lock)

	return { notification_number, segment_start_time };
end

