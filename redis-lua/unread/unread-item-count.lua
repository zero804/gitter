  -- Keys are user:troupe keys
  local key_count = #KEYS

  local result = {}

  for k, v in pairs(KEYS) do
    local key_type = redis.call("TYPE", v)["ok"]
    local card

    if key_type == "set" then
      card = redis.call("SCARD", v)
    elseif key_type == "none" then
      card = 0;
    else
      card = redis.call("ZCARD", v);
    end

    table.insert(result, card)
  end

  return result