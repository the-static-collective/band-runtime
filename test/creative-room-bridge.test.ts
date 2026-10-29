import {describe,it,expect} from 'vitest';
import {reviewGrooveRoom,type RoomReview} from '../src/creative-room-bridge';
const h=(v:string)=>'sha256:'+v.repeat(64);
const safe:RoomReview={schema:'groove-room/cannon-review/v1',origin:'OWNER_LOCAL_SYNTHETIC_EXPORT',sourceParcelSha256:h('a'),returnParcelSha256:h('b'),parentParcelSha256:h('a'),sender:'FICTIONAL_A',recipient:'FICTIONAL_B',rights:'SENDER_ASSERTION_NOT_VERIFIED_LICENSE',semanticEffect:'none',transmitted:false,realParticipants:0,publicationAuthorized:false,decision:'INTERESTING'};
describe('Groove to Band witness boundary',()=>{
 it('uses original event store with four receipts but no semantic events',()=>{
 const r=reviewGrooveRoom(safe);expect(r).toEqual(reviewGrooveRoom(safe));
 expect(r.witnessEvents.map(e=>e.type)).toEqual(['session.opened','capture.recorded','handoff.recorded','return.recorded','decision.recorded']);expect(r.semanticInputs).toBe(0);expect(r.published).toBe(false);
 });
 it('refuses false parent',()=>expect(()=>reviewGrooveRoom({...safe,parentParcelSha256:h('c')})).toThrow('ANCESTRY'));
 it('refuses rights, transport, invented real people',()=>{
 for(const patch of [{publicationAuthorized:true},{transmitted:true},{semanticEffect:'admitted'},{realParticipants:2},{sender:'Alice'},{rights:'LICENSED'}])
 expect(()=>reviewGrooveRoom({...safe,...patch} as RoomReview)).toThrow('ROOM_BRIDGE_REFUSE');
 });
 it('KEEP is a witnessed decision, never a release',()=>{const r=reviewGrooveRoom({...safe,decision:'KEEP'});expect(r.semanticInputs).toBe(0);expect(r.rightsVerified).toBe(false)});
 it('unknown keys cannot add authority',()=>expect(()=>reviewGrooveRoom({...safe,pressApproved:true} as RoomReview)).toThrow('FIELDS'));
});
