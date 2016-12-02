export default function getContext(){
  if(!window.context) {
    window.context = JSON.parse(window.jsonContext);
  }
  return window.context;
}
