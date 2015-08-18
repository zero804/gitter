  -- Keys are user:troupe, mention keys

  local result = {}
  local key_count = #KEYS/2

  local make_set = function (items)
    local set = {}
    for _, l in ipairs(items) do set[l] = true end
    return set;
  end

  -- Optimised count of distinct(unread_items + mentions)
  local count_distinct = function(unread_items, mentions)
    local mention_set = make_set(mentions);

    local outstanding_mention_count = #mentions;
    local len = #unread_items
    for i = 1, len do
      local item = unread_items[i]
      if mention_set[item] then
        table.remove(mention_set, item)
        outstanding_mention_count = outstanding_mention_count - 1

        if outstanding_mention_count == 0 then
          return #unread_items
        end
      end
    end

    return outstanding_mention_count + #unread_items
  end

  for i = 1,key_count do
  	local index = (i - 1) * 2 + 1;
  	local unread_items_key = KEYS[index]
  	local mentions_key = KEYS[index + 1]

    local key_type = redis.call("TYPE", unread_items_key)["ok"]
    local has_mentions = redis.call("EXISTS", mentions_key) == 1
    local total_card, mention_card

    if not has_mentions then
      -- No mentions, just return the cardinality of the set/zset
      mention_card = 0

      if key_type == "set" then
        total_card = redis.call("SCARD", unread_items_key)
      elseif key_type == "none" then
        total_card = 0;
      else
        total_card = redis.call("ZCARD", unread_items_key);
      end
    else
      -- Mentions, return the cardinality of mentions and unread items combined
      mention_card = redis.call("SCARD", mentions_key)
      if key_type == "set" then
        local items = redis.call("SUNION", unread_items_key, mentions_key)
        total_card = #items
      elseif key_type == "none" then
        total_card = mention_card
      else
        local unread_items = redis.call("ZRANGE", unread_items_key, 0, -1);
        local mention_items = redis.call("SMEMBERS", mentions_key);
        total_card = count_distinct(unread_items, mention_items)
      end
    end

    table.insert(result, total_card)
    table.insert(result, mention_card)
  end

  return result
