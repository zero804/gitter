-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]

local user_troupe_mention_key = KEYS[1]

local count = -1;

if redis.call("SREM", user_troupe_mention_key, unpack(ARGV)) > 0 then
  count = redis.call("SCARD", user_troupe_mention_key);
end

return count