-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]

local user_troupe_mention_key = KEYS[1]
local user_mentions_key = KEYS[2]
local troupe_id = table.remove(ARGV, 1)
local count = -1;

if redis.call("SREM", user_troupe_mention_key, unpack(ARGV)) > 0 then
  count = redis.call("SCARD", user_troupe_mention_key);
  if count == 0 then
    -- If count is zero, then this user no longer has any mentions in this troupe
    -- and we can remove the troupeId from the users mention key
    redis.call("SREM", user_mentions_key, troupe_id)
  end
end

return count