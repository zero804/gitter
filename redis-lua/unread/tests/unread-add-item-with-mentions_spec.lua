require('./utils')
local call_redis_script = require "./harness";

local inspect = require('inspect')

local USER_1 = "user1"
local ROOM_1 = "room"
local ITEM_1 = "item1"
local ITEM_2 = "item2"
local USER_TROUPE_UNREAD_KEY = "room1";
local TIME_NOW = 1
local TIME_NOW_2 = 22


describe("unread-add-item-with-mentions", function()
  before_each(function()
    redis.call('FLUSHDB')
  end)

  it("should add single items", function()
    local result = call_redis_script('../unread-add-item-with-mentions.lua',
      { EMAIL_KEY, user_troupe_key(USER_1, ROOM_1), user_badge_key(USER_1) },
      { 1, ROOM_1, ITEM_1, TIME_NOW, USER_1 });
    assert.are.same({ 1, 1 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)

   it("should not add duplicate items", function()
    local result = call_redis_script('../unread-add-item-with-mentions.lua',
      { EMAIL_KEY, user_troupe_key(USER_1, ROOM_1), user_badge_key(USER_1) },
      { 1, ROOM_1, ITEM_1, TIME_NOW, USER_1 });
    assert.are.same({ 1, 1 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

    local result = call_redis_script('../unread-add-item-with-mentions.lua',
      { EMAIL_KEY, user_troupe_key(USER_1, ROOM_1), user_badge_key(USER_1) },
      { 1, ROOM_1, ITEM_1, TIME_NOW, USER_1 });
    assert.are.same({ -1, 0 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)

  it("should add multiple items", function()
    local result = call_redis_script('../unread-add-item-with-mentions.lua',
      { EMAIL_KEY, user_troupe_key(USER_1, ROOM_1), user_badge_key(USER_1) },
      { 1, ROOM_1, ITEM_1, TIME_NOW, USER_1 });

    assert.are.same({ 1, 1 }, result)

   assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1 },
        user_badge_values  = { ROOM_1, '1' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

    local result = call_redis_script('../unread-add-item-with-mentions.lua',
      { EMAIL_KEY, user_troupe_key(USER_1, ROOM_1), user_badge_key(USER_1) },
      { 1, ROOM_1, ITEM_2, TIME_NOW_2, USER_1 });

    assert.are.same({ 2, 0 }, result)

    assertState(USER_1, ROOM_1, {
        user_room_set_type = 'set',
        unread_items       = { ITEM_1, ITEM_2 },
        user_badge_values  = { ROOM_1, '2' },
        email_values  = { [ROOM_1 .. ':' .. USER_1] =  tostring(TIME_NOW) }
      });

  end)


end)
