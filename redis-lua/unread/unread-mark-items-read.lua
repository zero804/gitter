local user_badge_key = KEYS[1]
local user_troupe_key = KEYS[2]
local email_hash_key = KEYS[3]
local user_troupe_mention_key = KEYS[4]
local user_mention_key = KEYS[5]
local user_email_latch_key = KEYS[6];

local troupe_id = table.remove(ARGV, 1)
local user_id = table.remove(ARGV, 1)

local key_type = redis.call("TYPE", user_troupe_key)["ok"];

local result = {}
local flag = 0
local card = -1
local mention_count = -1
local mentions_removed = false

while #ARGV > 0 do
  local item_id = table.remove(ARGV, 1)

  local removed;

  if key_type == "set" then
    removed = redis.call("SREM", user_troupe_key, item_id)
    if removed > 0 then
      card = redis.call("SCARD", user_troupe_key)
    end
  elseif key_type == "none" then
    removed = 0;
  else
    removed = redis.call("ZREM", user_troupe_key, item_id)

    if removed > 0 then
      card = redis.call("ZCARD", user_troupe_key)
    end
  end
  
  -- This should actually be taken care of by a call to
  -- remove-user-mentions, but we do it here too
  -- in order to prevent consistency problems

  if card == 0 then
    local r1 = redis.call("DEL", user_troupe_mention_key) > 0
    local r2 = redis.call("SREM", user_mention_key, troupe_id) > 0
    
    if r1 or r2 then
       -- Even though the cardinality was zero
       -- items exists
       flag = 1
       mention_count = 0
    end
  else 
    -- Remove the mention if it exists too
    if redis.call("SREM", user_troupe_mention_key, item_id) > 0 then
      mentions_removed = true
    end
  end

	-- If this item has not already been removed.....
	if removed > 0 then
		-- Then we need to decrement the ZSET for this user for this troupe

		-- If this is the first for this troupe for this user, the badge count is going to increment
		if tonumber(redis.call("ZINCRBY", user_badge_key, -1, troupe_id)) <= 0 then
			redis.call("ZREMRANGEBYSCORE", user_badge_key, '-inf', 0)
			flag = 1
		end
	end
end

if mentions_removed then
  mention_count = redis.call("SCARD", user_troupe_mention_key);
  if mention_count == 0 then
    -- If mention_count is zero, then this user no longer has any mentions in this troupe
    -- and we can remove the troupeId from the users mention key
    redis.call("SREM", user_mention_key, troupe_id)
  end
end

-- Remove this user from the list of people who may get an email
redis.call("DEL", user_email_latch_key);
redis.call("HDEL", email_hash_key, troupe_id..':'..user_id)

table.insert(result, card)
table.insert(result, mention_count)
table.insert(result, flag)

return result
