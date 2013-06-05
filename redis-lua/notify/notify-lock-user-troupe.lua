local primary_lock = KEYS[1];
local segment_lock = KEYS[2];
local time_now = ARGV[1];
local expire_time_seconds = ARGV[2];

local obtain_lock = redis.call("SETNX", primary_lock, '1')

if obtain_lock == 1 then
	redis.call("EXPIRE", primary_lock, expire_time_seconds)
	redis.call("SETEX", segment_lock, expire_time_seconds, time_now)

	return 1
else
	local obtain_seg_lock = redis.call("SETNX", segment_lock, time_now)
	if obtain_seg_lock == 1 then
		return redis.call("INCR", primary_lock)
	end
end

return 0
