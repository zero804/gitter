-- Keys are user:troupe keys follows by user:count keys
-- Values are [troupe_id, item_id]
local item_id = ARGV[1]
local troupe_id = ARGV[2]
local key_count = #KEYS/3

local result = {}

for i = 1,key_count do
	local user_troupe_mention_key = KEYS[i]
	local user_badge_key = KEYS[i + key_count]
  local user_mention_key = KEYS[i + 2 * key_count];

  local count = -1;

	if redis.call("SADD", user_troupe_mention_key, item_id) > 0 then
    count = redis.call("SCARD", user_troupe_mention_key);
    -- If count equals exactly one then this is the first time this user has been mentioned in this
    -- room, so we'll need to add this troupeId to the users mention key
    if count == 1 then
      redis.call("SADD", user_mention_key, troupe_id)
    end
	end

  table.insert(result, count);
end

return result