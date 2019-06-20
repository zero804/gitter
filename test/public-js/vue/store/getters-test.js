'use strict';

const createState = require('../../../../public/js/vue/store/state').default;
const getters = require('../../../../public/js/vue/store/getters');

const {
  createSerializedRoomFixture,
  createSerializedOneToOneRoomFixture
} = require('../fixture-helpers');

describe('getters', () => {
  let state;
  beforeEach(() => {
    state = createState();
  });

  describe('displayedRoom', () => {
    it('non-existent room is undefined', () => {
      state.displayedRoomId = '000';

      const displayedRoom = getters.displayedRoom(state);
      expect(displayedRoom).toEqual(undefined);
    });

    it('returns full room object for displayedRoomId', () => {
      const room1 = createSerializedRoomFixture('community/room1');
      state.roomMap = {
        [room1.id]: room1
      };

      state.displayedRoomId = room1.id;

      const displayedRoom = getters.displayedRoom(state);
      expect(displayedRoom).toEqual(room1);
    });
  });

  describe('displayedRooms', () => {
    it('when the user has not joined any rooms yet, then no rooms to display', () => {
      state.leftMenuState = 'all';

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([]);
    });

    it('when the left-menu is in "All conversations" state, shows all rooms', () => {
      state.leftMenuState = 'all';

      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = createSerializedRoomFixture('community/room2');
      const oneToOneRoom1 = createSerializedOneToOneRoomFixture('onetoone/room1');
      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [oneToOneRoom1.id]: oneToOneRoom1
      };

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([room1, room2, oneToOneRoom1]);
    });

    it('when the left-menu is in "People"/one to one rooms state, only shows one to one rooms', () => {
      state.leftMenuState = 'people';

      const room1 = createSerializedRoomFixture('community/room1');
      const room2 = createSerializedRoomFixture('community/room2');
      const oneToOneRoom1 = createSerializedOneToOneRoomFixture('onetoone/room1');
      state.roomMap = {
        [room1.id]: room1,
        [room2.id]: room2,
        [oneToOneRoom1.id]: oneToOneRoom1
      };

      const displayedRooms = getters.displayedRooms(state);
      expect(displayedRooms).toEqual([oneToOneRoom1]);
    });
  });
});
