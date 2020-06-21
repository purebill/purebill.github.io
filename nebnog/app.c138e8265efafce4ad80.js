!function(e){var n={};function t(r){if(n[r])return n[r].exports;var o=n[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,t),o.l=!0,o.exports}t.m=e,t.c=n,t.d=function(e,n,r){t.o(e,n)||Object.defineProperty(e,n,{enumerable:!0,get:r})},t.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},t.t=function(e,n){if(1&n&&(e=t(e)),8&n)return e;if(4&n&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(t.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&n&&"string"!=typeof e)for(var o in e)t.d(r,o,function(n){return e[n]}.bind(null,o));return r},t.n=function(e){var n=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(n,"a",n),n},t.o=function(e,n){return Object.prototype.hasOwnProperty.call(e,n)},t.p="",t(t.s=9)}([function(module,__webpack_exports__,__webpack_require__){"use strict";const constructors=new Map,Serialization={serialize:e=>{if("function"==typeof e.__serialize&&e.__proto__.constructor.__type){let n=e.__proto__.constructor.__type;return JSON.stringify({type:n,data:e.__serialize()})}throw new Error("Can't serialize "+e)},registerConstructor:(e,n)=>{if(constructors.has(e))throw new Error("The constructor already exist: "+e);constructors.set(e,n)}};let _uCount=0;Serialization.unserialize=e=>{let n=e;if("string"==typeof n&&(n=JSON.parse(n)),!n.type)throw new Error("'type' expected. Can't unserialize "+n);try{_uCount++;let e=constructors.get(n.type);if(void 0===e)throw new Error("No constructor registered for type: "+n.type);let t=e();return t.__unserialize(n.data),t}finally{_uCount--}},Serialization.unserializeExisting=(o,s)=>{let pojo=JSON.parse(s);if(!pojo.type)throw new Error("Can't unserialize "+pojo);{let constructor=eval(pojo.type);if(!constructor.prototype.__unserialize)throw new Error("Type "+constructor.name+" has no __unserialize instance method");if(!(o instanceof constructor))throw new Error("Instance is not of the type "+pojo.type);o.__unserialize(pojo.data)}},Serialization.linkRequests=[],Serialization.getLink=(e,n,t)=>{if(t=t||(()=>{}),0==_uCount)throw new Error("getLink can only be called inside __unserialize mathod");Serialization.linkRequests.push({id:e,consumer:n,defaultProducer:t})},Serialization.resetLinks=()=>Serialization.linkRequests=[],Serialization.resolveLinks=e=>{if(0!=_uCount)throw new Error("resolveLinks can only be called outside __unserialize mathod");Serialization.linkRequests.forEach(n=>{let t;if(n.id instanceof Array)t=n.id.map(t=>{let r=e.get(t);if(void 0===r)throw n.defaultProducer&&(r=n.defaultProducer()),new Error("Unresolved link")});else if(t=e.get(n.id),void 0===t){if(!n.defaultProducer)throw new Error("Unresolved link");t=n.defaultProducer()}n.consumer(t)})},__webpack_exports__.a=Serialization},function(e,n,t){"use strict";var r,o=function(){return void 0===r&&(r=Boolean(window&&document&&document.all&&!window.atob)),r},i=function(){var e={};return function(n){if(void 0===e[n]){var t=document.querySelector(n);if(window.HTMLIFrameElement&&t instanceof window.HTMLIFrameElement)try{t=t.contentDocument.head}catch(e){t=null}e[n]=t}return e[n]}}(),a=[];function s(e){for(var n=-1,t=0;t<a.length;t++)if(a[t].identifier===e){n=t;break}return n}function l(e,n){for(var t={},r=[],o=0;o<e.length;o++){var i=e[o],l=n.base?i[0]+n.base:i[0],d=t[l]||0,c="".concat(l," ").concat(d);t[l]=d+1;var u=s(c),h={css:i[1],media:i[2],sourceMap:i[3]};-1!==u?(a[u].references++,a[u].updater(h)):a.push({identifier:c,updater:b(h,n),references:1}),r.push(c)}return r}function d(e){var n=document.createElement("style"),r=e.attributes||{};if(void 0===r.nonce){var o=t.nc;o&&(r.nonce=o)}if(Object.keys(r).forEach((function(e){n.setAttribute(e,r[e])})),"function"==typeof e.insert)e.insert(n);else{var a=i(e.insert||"head");if(!a)throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");a.appendChild(n)}return n}var c,u=(c=[],function(e,n){return c[e]=n,c.filter(Boolean).join("\n")});function h(e,n,t,r){var o=t?"":r.media?"@media ".concat(r.media," {").concat(r.css,"}"):r.css;if(e.styleSheet)e.styleSheet.cssText=u(n,o);else{var i=document.createTextNode(o),a=e.childNodes;a[n]&&e.removeChild(a[n]),a.length?e.insertBefore(i,a[n]):e.appendChild(i)}}function p(e,n,t){var r=t.css,o=t.media,i=t.sourceMap;if(o?e.setAttribute("media",o):e.removeAttribute("media"),i&&btoa&&(r+="\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(i))))," */")),e.styleSheet)e.styleSheet.cssText=r;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(r))}}var f=null,m=0;function b(e,n){var t,r,o;if(n.singleton){var i=m++;t=f||(f=d(n)),r=h.bind(null,t,i,!1),o=h.bind(null,t,i,!0)}else t=d(n),r=p.bind(null,t,n),o=function(){!function(e){if(null===e.parentNode)return!1;e.parentNode.removeChild(e)}(t)};return r(e),function(n){if(n){if(n.css===e.css&&n.media===e.media&&n.sourceMap===e.sourceMap)return;r(e=n)}else o()}}e.exports=function(e,n){(n=n||{}).singleton||"boolean"==typeof n.singleton||(n.singleton=o());var t=l(e=e||[],n);return function(e){if(e=e||[],"[object Array]"===Object.prototype.toString.call(e)){for(var r=0;r<t.length;r++){var o=s(t[r]);a[o].references--}for(var i=l(e,n),d=0;d<t.length;d++){var c=s(t[d]);0===a[c].references&&(a[c].updater(),a.splice(c,1))}t=i}}}},function(e,n,t){"use strict";e.exports=function(e){var n=[];return n.toString=function(){return this.map((function(n){var t=function(e,n){var t=e[1]||"",r=e[3];if(!r)return t;if(n&&"function"==typeof btoa){var o=(a=r,s=btoa(unescape(encodeURIComponent(JSON.stringify(a)))),l="sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(s),"/*# ".concat(l," */")),i=r.sources.map((function(e){return"/*# sourceURL=".concat(r.sourceRoot||"").concat(e," */")}));return[t].concat(i).concat([o]).join("\n")}var a,s,l;return[t].join("\n")}(n,e);return n[2]?"@media ".concat(n[2]," {").concat(t,"}"):t})).join("")},n.i=function(e,t,r){"string"==typeof e&&(e=[[null,e,""]]);var o={};if(r)for(var i=0;i<this.length;i++){var a=this[i][0];null!=a&&(o[a]=!0)}for(var s=0;s<e.length;s++){var l=[].concat(e[s]);r&&o[l[0]]||(t&&(l[2]?l[2]="".concat(t," and ").concat(l[2]):l[2]=t),n.push(l))}},n}},function(e,n,t){var r=t(1),o=t(4);"string"==typeof(o=o.__esModule?o.default:o)&&(o=[[e.i,o,""]]);var i={insert:"head",singleton:!1};r(o,i);e.exports=o.locals||{}},function(e,n,t){(n=t(2)(!1)).push([e.i,"/* see https://watercss.kognise.dev/ */\n\n/**\n * Light-themed version:\n * uses light theme by default but switches to dark theme\n * if a system-wide theme preference is set on the user's device.\n *\n * Variables will remain uncompiled so the theme can update dynamically\n * at runtime in the browser.\n */\n\n :root {\n  --background-body: #fff;\n  --background: #efefef;\n  --background-alt: #f7f7f7;\n  --selection: #9e9e9e;\n  --text-main: #363636;\n  --text-bright: #000;\n  --text-muted: #999;\n  --links: #0076d1;\n  --focus: #0096bfab;\n  --border: #dbdbdb;\n  --code: #000;\n  --animation-duration: 0.1s;\n  --button-hover: #ddd;\n  --scrollbar-thumb: rgb(213, 213, 213);\n  --scrollbar-thumb-hover: rgb(196, 196, 196);\n  --form-placeholder: #949494;\n  --form-text: #000;\n  --variable: #39a33c;\n  --highlight: #ff0;\n  --select-arrow: url(\"data:image/svg+xml;charset=utf-8,%3C?xml version='1.0' encoding='utf-8'?%3E %3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='62.5' width='116.9' fill='%23161f27'%3E %3Cpath d='M115.3,1.6 C113.7,0 111.1,0 109.5,1.6 L58.5,52.7 L7.4,1.6 C5.8,0 3.2,0 1.6,1.6 C0,3.2 0,5.8 1.6,7.4 L55.5,61.3 C56.3,62.1 57.3,62.5 58.4,62.5 C59.4,62.5 60.5,62.1 61.3,61.3 L115.2,7.4 C116.9,5.8 116.9,3.2 115.3,1.6Z'/%3E %3C/svg%3E\");\n}\n\n@media (prefers-color-scheme: dark) {\n:root {\n  --background-body: #202b38;\n  --background: #161f27;\n  --background-alt: #1a242f;\n  --selection: #161f27;\n  --text-main: #dbdbdb;\n  --text-bright: #fff;\n  --text-muted: #717880;\n  --links: #41adff;\n  --focus: #0096bfab;\n  --border: #dbdbdb;\n  --code: #ffbe85;\n  --animation-duration: 0.1s;\n  --button-hover: #324759;\n  --scrollbar-thumb: var(--button-hover);\n  --scrollbar-thumb-hover: rgb(20, 20, 20);\n  --form-placeholder: #a9a9a9;\n  --form-text: #fff;\n  --variable: #d941e2;\n  --highlight: #efdb43;\n  --select-arrow: url(\"data:image/svg+xml;charset=utf-8,%3C?xml version='1.0' encoding='utf-8'?%3E %3Csvg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' height='62.5' width='116.9' fill='%23efefef'%3E %3Cpath d='M115.3,1.6 C113.7,0 111.1,0 109.5,1.6 L58.5,52.7 L7.4,1.6 C5.8,0 3.2,0 1.6,1.6 C0,3.2 0,5.8 1.6,7.4 L55.5,61.3 C56.3,62.1 57.3,62.5 58.4,62.5 C59.4,62.5 60.5,62.1 61.3,61.3 L115.2,7.4 C116.9,5.8 116.9,3.2 115.3,1.6Z'/%3E %3C/svg%3E\");\n}\n}\n\nbody {\n  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;\n  line-height: 1.4;\n\n  max-width: 800px;\n  margin: 20px auto;\n  padding: 0 10px;\n  word-wrap: break-word;\n\n  color: var(--text-main);\n  background: var(--background-body);\n\n  text-rendering: optimizeLegibility;\n}\n\nbutton, input, textarea {\n  transition: background-color var(--animation-duration) linear,\n              border-color var(--animation-duration) linear,\n              color var(--animation-duration) linear,\n              box-shadow var(--animation-duration) linear,\n              transform var(--animation-duration) ease;\n}\n\nh1 {\n  font-size: 2.2em;\n  margin-top: 0;\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6 {\n  margin-bottom: 12px;\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\nstrong {\n  color: var(--text-bright);\n}\n\nh1,\nh2,\nh3,\nh4,\nh5,\nh6,\nb,\nstrong,\nth {\n  font-weight: 600;\n}\n\nq::before {\n   content: none;\n}\n\nq::after {\n   content: none;\n}\n\nblockquote, q {\n  border-left: 4px solid var(--focus);\n  margin: 1.5em 0em;\n  padding: 0.5em 1em;\n  font-style: italic;\n}\n\nblockquote > footer {\n  font-style: normal;\n  border: 0;\n}\n\nblockquote cite {\n  font-style: normal;\n}\n\naddress {\n  font-style: normal;\n}\n\na[href^='mailto\\:']::before {\n  content: '📧 ';\n}\n\na[href^='tel\\:']::before {\n  content: '📞 ';\n}\n\na[href^='sms\\:']::before {\n  content: '💬 ';\n}\n\nmark {\n  background-color: var(--highlight);\n  border-radius: 2px;\n  padding: 0px 2px 0px 2px;\n  color: #000000;\n}\n\nbutton, select,\ninput[type='submit'],\ninput[type='button'],\ninput[type='checkbox'],\ninput[type='range'],\ninput[type='radio'] {\n  cursor: pointer;\n}\n\ninput:not([type='checkbox']):not([type='radio']),\nselect {\n  display: block;\n}\n\ninput,\nbutton,\ntextarea,\nselect {\n  color: var(--form-text);\n  background-color: var(--background);\n\n  font-family: inherit;\n  font-size: inherit;\n\n  margin-right: 6px;\n  margin-bottom: 6px;\n  padding: 10px;\n\n  border: none;\n  border-radius: 6px;\n  outline: none;\n}\n\ninput,\nselect,\nbutton,\ntextarea {\n  -webkit-appearance: none;\n}\n\ntextarea {\n  margin-right: 0;\n  width: 100%;\n  box-sizing: border-box;\n  resize: vertical;\n}\n\nselect {\n  background: var(--background) var(--select-arrow) calc(100% - 12px) 50% / 12px no-repeat;\n  padding-right: 35px;\n}\n\nselect::-ms-expand {\n  display: none;\n}\n\nselect[multiple] {\n  padding-right: 10px;\n  background-image: none;\n  overflow-y: auto;\n}\n\nbutton,\ninput[type='submit'],\ninput[type='button'] {\n  padding-right: 30px;\n  padding-left: 30px;\n}\n\nbutton:hover,\ninput[type='submit']:hover,\ninput[type='button']:hover {\n  background: var(--button-hover);\n}\n\ninput:focus,\nselect:focus,\nbutton:focus,\ntextarea:focus {\n  box-shadow: 0 0 0 2px var(--focus);\n}\n\ninput[type='checkbox'],\ninput[type='radio'] {\n  position: relative;\n  width: 14px;\n  height: 14px;\n  display: inline-block;\n  vertical-align: middle;\n  margin: 0;\n  margin-right: 2px;\n}\n\ninput[type='radio'] {\n  border-radius: 50%;\n}\n\ninput[type='checkbox']:checked,\ninput[type='radio']:checked {\n  background: var(--button-hover);\n}\n\ninput[type='checkbox']:checked::before,\ninput[type='radio']:checked::before {\n  content: '•';\n  display: block;\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  transform: translateX(-50%) translateY(-50%);\n}\n\ninput[type='checkbox']:checked::before {\n  content: '✔';\n  transform: translateY(-50%) translateY(0.5px) translateX(-6px);\n}\n\ninput[type='checkbox']:active,\ninput[type='radio']:active,\ninput[type='submit']:active,\ninput[type='button']:active,\ninput[type='range']:active,\nbutton:active {\n  transform: translateY(2px);\n}\n\ninput:disabled,\nselect:disabled,\nbutton:disabled,\ntextarea:disabled {\n  cursor: not-allowed;\n  opacity: 0.5;\n}\n\n::-webkit-input-placeholder {\n  color: var(--form-placeholder);\n}\n\n::-moz-placeholder {\n  color: var(--form-placeholder);\n}\n\n::-ms-input-placeholder {\n  color: var(--form-placeholder);\n}\n\n::placeholder {\n  color: var(--form-placeholder);\n}\n\nfieldset {\n  border: 1px var(--focus) solid;\n  border-radius: 6px;\n  margin: 0;\n  margin-bottom: 6px;\n  padding: 10px;\n}\n\nlegend {\n  font-size: 0.9em;\n  font-weight: 600;\n}\n\ninput[type='range'] {\n  margin: 10px 0;\n  padding: 10px 0;\n  background: transparent;\n}\n\ninput[type='range']:focus {\n  outline: none;\n}\n\ninput[type='range']::-webkit-slider-runnable-track {\n  width: 100%;\n  height: 9.5px;\n  transition: 0.2s;\n  background: var(--background);\n  border-radius: 3px;\n}\n\ninput[type='range']::-webkit-slider-thumb {\n  box-shadow: 0px 1px 1px #000000, 0px 0px 1px #0d0d0d;\n  height: 20px;\n  width: 20px;\n  border-radius: 50%;\n  background: var(--border);\n  -webkit-appearance: none;\n  margin-top: -7px;\n}\n\ninput[type='range']:focus::-webkit-slider-runnable-track {\n  background: var(--background);\n}\n\ninput[type='range']::-moz-range-track {\n  width: 100%;\n  height: 9.5px;\n  transition: 0.2s;\n  background: var(--background);\n  border-radius: 3px;\n}\n\ninput[type='range']::-moz-range-thumb {\n  box-shadow: 1px 1px 1px #000000, 0px 0px 1px #0d0d0d;\n  height: 20px;\n  width: 20px;\n  border-radius: 50%;\n  background: var(--border);\n}\n\ninput[type='range']::-ms-track {\n  width: 100%;\n  height: 9.5px;\n  background: transparent;\n  border-color: transparent;\n  border-width: 16px 0;\n  color: transparent;\n}\n\ninput[type='range']::-ms-fill-lower {\n  background: var(--background);\n  border: 0.2px solid #010101;\n  border-radius: 3px;\n  box-shadow: 1px 1px 1px #000000, 0px 0px 1px #0d0d0d;\n}\n\ninput[type='range']::-ms-fill-upper {\n  background: var(--background);\n  border: 0.2px solid #010101;\n  border-radius: 3px;\n  box-shadow: 1px 1px 1px #000000, 0px 0px 1px #0d0d0d;\n}\n\ninput[type='range']::-ms-thumb {\n  box-shadow: 1px 1px 1px #000000, 0px 0px 1px #0d0d0d;\n  border: 1px solid #000000;\n  height: 20px;\n  width: 20px;\n  border-radius: 50%;\n  background: var(--border);\n}\n\ninput[type='range']:focus::-ms-fill-lower {\n  background: var(--background);\n}\n\ninput[type='range']:focus::-ms-fill-upper {\n  background: var(--background);\n}\n\na {\n  text-decoration: none;\n  color: var(--links);\n}\n\na:hover {\n  text-decoration: underline;\n}\n\ncode, samp, time {\n  background:  var(--background);\n  color: var(--code);\n  padding: 2.5px 5px;\n  border-radius: 6px;\n  font-size: 1em;\n}\n\npre > code {\n  padding: 10px;\n  display: block;\n  overflow-x: auto;\n}\n\nvar {\n  color: var(--variable);\n  font-style: normal;\n  font-family: monospace;\n}\n\nkbd {\n  background: var(--background);\n  border: 1px solid var(--border);\n  border-radius: 2px;\n  color: var(--text-main);\n  padding: 2px 4px 2px 4px;\n}\n\nimg {\n  max-width: 100%;\n  height: auto;\n}\n\nhr {\n  border: none;\n  border-top: 1px solid var(--border);\n}\n\ntable {\n  border-collapse: collapse;\n  margin-bottom: 10px;\n  width: 100%;\n}\n\ntd,\nth {\n  padding: 6px;\n  text-align: left;\n}\n\nthead {\n  border-bottom: 1px solid var(--border);\n}\n\ntfoot {\n  border-top: 1px solid var(--border);\n}\n\ntbody tr:nth-child(even) {\n  background-color: var(--background-alt);\n}\n\n::-webkit-scrollbar {\n  height: 10px;\n  width: 10px;\n}\n\n::-webkit-scrollbar-track {\n  background: var(--background);\n  border-radius: 6px;\n}\n\n::-webkit-scrollbar-thumb {\n  background: var(--scrollbar-thumb);\n  border-radius: 6px;\n}\n\n::-webkit-scrollbar-thumb:hover {\n  background: var(--scrollbar-thumb-hover);\n}\n\n::-moz-selection {\n  background-color: var(--selection);\n}\n\n::selection {\n  background-color: var(--selection);\n}\n\ndetails {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-start;\n  background-color: var(--background-alt);\n  padding: 10px 10px 0;\n  margin: 1em 0;\n  border-radius: 6px;\n  overflow: hidden;\n}\n\ndetails[open] {\n  padding: 10px;\n}\n\ndetails > :last-child {\n  margin-bottom: 0;\n}\n\ndetails[open] summary {\n  margin-bottom: 10px;\n}\n\nsummary {\n  display: list-item;\n  background-color: var(--background);\n  padding: 10px;\n  margin: -10px -10px 0;\n}\n\ndetails > :not(summary) {\n  margin-top: 0;\n}\n\nsummary::-webkit-details-marker {\n  color: var(--text-main);\n}\n\nfooter {\n  border-top: 1px solid var(--background);\n  padding-top: 10px;\n  font-size: 0.8em;\n  color: var(--text-muted);\n}",""]),e.exports=n},function(e,n,t){var r=t(1),o=t(6);"string"==typeof(o=o.__esModule?o.default:o)&&(o=[[e.i,o,""]]);var i={insert:"head",singleton:!1};r(o,i);e.exports=o.locals||{}},function(e,n,t){(n=t(2)(!1)).push([e.i,".error {\n  outline: 2px solid #ffcccc;\n}\n\nmark.error {\n  display: none;\n}\n\n.error + mark.error {\n  display: block;\n  background-color: #ffcccc;\n  color: #8a1e1e;\n}",""]),e.exports=n},function(e,n,t){var r=t(1),o=t(8);"string"==typeof(o=o.__esModule?o.default:o)&&(o=[[e.i,o,""]]);var i={insert:"head",singleton:!1};r(o,i);e.exports=o.locals||{}},function(e,n,t){(n=t(2)(!1)).push([e.i,"/* Generated by https://projects.lukehaas.me/css-loaders/ */\n\n.loader,\n.loader:before,\n.loader:after {\n  background: #000000;\n  -webkit-animation: load1 1s infinite ease-in-out;\n  animation: load1 1s infinite ease-in-out;\n  width: 1em;\n  height: 4em;\n}\n.loader {\n  color: #000000;\n  text-indent: -9999em;\n  margin: 88px auto;\n  position: relative;\n  font-size: 11px;\n  -webkit-transform: translateZ(0);\n  -ms-transform: translateZ(0);\n  transform: translateZ(0);\n  -webkit-animation-delay: -0.16s;\n  animation-delay: -0.16s;\n}\n.loader:before,\n.loader:after {\n  position: absolute;\n  top: 0;\n  content: '';\n}\n.loader:before {\n  left: -1.5em;\n  -webkit-animation-delay: -0.32s;\n  animation-delay: -0.32s;\n}\n.loader:after {\n  left: 1.5em;\n}\n@-webkit-keyframes load1 {\n  0%,\n  80%,\n  100% {\n    box-shadow: 0 0;\n    height: 4em;\n  }\n  40% {\n    box-shadow: 0 -2em;\n    height: 5em;\n  }\n}\n@keyframes load1 {\n  0%,\n  80%,\n  100% {\n    box-shadow: 0 0;\n    height: 4em;\n  }\n  40% {\n    box-shadow: 0 -2em;\n    height: 5em;\n  }\n}\n",""]),e.exports=n},function(e,n,t){"use strict";t.r(n);t(3),t(5),t(7);function r(e,n){return void 0===n&&(n=e,e=0),e+Math.round(Math.random()*(n-e))}class o extends Error{constructor(e){super(e)}}class i extends Error{constructor(e){super(e)}}const a="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~".split("");const s=/[\u007f-\uffff]/g;function l(e){return JSON.stringify(e).replace(s,(function(e){return"\\u"+("000"+e.charCodeAt(0).toString(16)).slice(-4)}))}var d=t(0);class c{constructor(e){this._optional=!!e}validate(e){return!0}toHtmlElement(){throw new Error("Not implemented")}toText(e,n){return`## ${e}\n${n}`}__serialize(){return{optional:this._optional}}__unserialize(e){this._optional=e.optional}}d.a.registerConstructor(c.__type="NebNogField",()=>new c);class u extends c{constructor(e){super((e=Object.assign({rows:void 0,minLen:void 0,maxLen:void 0,regex:void 0,optional:!1},e||{})).optional),this._minLen=e.minLen,this._maxLen=e.maxLen,this._regex=e.regex,this._rows=e.rows||1}toHtmlElement(){let e;return this._rows>1?(e=document.createElement("textarea"),e.rows=this._rows):(e=document.createElement("input"),e.type="text"),this._minLen&&(e.minLength=this._minLen),this._maxLen&&(e.maxLength=this._maxLen),e}validate(e){return"string"==typeof e&&(this._optional||!e.match(/^\s*$/))&&(void 0===this._minLen||e.length>=this._minLen)&&(void 0===this._maxLen||e.length<=this._maxLen)&&(void 0===this._regex||null!==e.match(this._regex))}__serialize(){return Object.assign(super.__serialize(),{minLen:this._minLen,maxLen:this._maxLen,regex:this._regex,rows:this._rows})}__unserialize(e){super.__unserialize(e),this._minLen=e.minLen,this._maxLen=e.maxLen,this._regex=e.regex,this._rows=e.rows}}d.a.registerConstructor(u.__type="TextField",()=>new u);class h extends c{constructor(e,n,t){super(t),this._yes=e,this._no=n}validate(e){return e==this._yes||e==this._no}toHtmlElement(){let e=document.createElement("input");return e.type="checkbox",e.value=this._no,e.onchange=()=>e.checked?e.value=this._yes:this._no,e}toText(e,n){return`**${e}:** ${n}`}__serialize(){let e=super.__serialize();return e.yes=this._yes,e.no=this._no,e}__unserialize(e){super.__unserialize(e),this._yes=e.yes,this._no=e.no}}d.a.registerConstructor(h.__type="BooleanField",()=>new h(null,null));class p extends c{constructor(e,n){super(n),this._options=e}validate(e){return this._optional||this._options.indexOf(e)>-1}toHtmlElement(){let e=document.createElement("select"),n=document.createElement("option");return n.value="",n.text="",e.add(n,null),this._options.forEach(n=>{let t=document.createElement("option");t.value=n,t.text=n,e.add(t,null)}),e}toText(e,n){return`**${e}:** ${n}`}__serialize(){return Object.assign(super.__serialize(),{options:this._options})}__unserialize(e){super.__unserialize(e),this._options=e.options}}d.a.registerConstructor(p.__type="SelectionField",()=>new p([]));class f{constructor(e){this.name=e,this._fields=new Map}getField(e){let n=this._fields.get(e);if(void 0===n)throw new Error("No such field: "+e);return n}getAllFields(){return this._fields}addField(e,n){if(this._fields.has(e))throw new Error("Field with the name already exist: "+e);this._fields.set(e,n)}__serialize(){let e={};return this._fields.forEach((n,t)=>e[t]=d.a.serialize(n)),{name:this.name,fields:e}}__unserialize(e){this.name=e.name,this._fields=new Map,Object.keys(e.fields).forEach(n=>this._fields.set(n,d.a.unserialize(e.fields[n])))}}d.a.registerConstructor(f.__type="NebNogTemplate",()=>new f(""));class m extends Error{constructor(e,n){super(`The value of the field ${e} is not valid: ${n}`),this.name=e,this.value=n}}class b{constructor(e,n){this._template=e,this._nebnog=n,this._values=new Map}setFieldValue(e,n){let t=this._template.getField(e);if(!t)throw new Error("No such field: "+e);if(!n.match(/^\s*$/)||!t._optional){if(!t.validate(n))throw new m(e,n);this._values.set(e,n)}}save(){return this._nebnog._saveNote(this)}_toObject(){this._template.getAllFields().forEach((e,n)=>{if(!e._optional&&!this._values.has(n))throw new m(n,"")});let e={};return this._values.forEach((n,t)=>e[t]=n),{template:this._template.name,values:e}}toText(){this._template.getAllFields().forEach((e,n)=>{if(!e._optional&&!this._values.has(n))throw new m(n,"")});let e=`# ${this._template.name}\n`;return this._values.forEach((n,t)=>e+=`\n${this._template.getField(t).toText(t,n)}\n`),e}}function g(e){return e<10?"0"+e:""+e}let _=new Map;function x(e){e=e||document.body;let n=_.get(e);if(void 0===n)throw new Error("unspinner() call without calling spinner()");n.nesting--,n.nesting>0||(n.spinnerDiv.parentNode.removeChild(n.spinnerDiv),n.spinnerDiv=null,_.delete(e))}function w(e,n){return function(e){e=e||document.body;let n=_.get(e);if(void 0!==n)return void n.nesting++;let t=document.createElement("div");t.style.position="absolute",t.style.left=e.offsetLeft+"px",t.style.top=e.offsetTop+"px",t.style.width=e.offsetWidth+"px",t.style.height=e.offsetHeight+"px",t.style.backgroundColor="#eeeeee",t.style.opacity="0.8",document.body.appendChild(t);let r=document.createElement("div");r.classList.add("loader"),r.innerText="Loading...",t.appendChild(r),e.appendChild(t),_.set(e,{spinnerDiv:t,nesting:1})}(n),e.then(e=>(x(n),e)).catch(e=>{throw x(n),e})}"http:"!=window.location.protocol||window.location.host.match(/^localhost/)||(window.location=window.location.href.replace(/^http:/,"https:"));const y=document.getElementById("btnAuth"),v=document.getElementById("authForm"),k=document.getElementById("frmAddNote"),C=document.getElementById("btnNewNote");let E=new class{constructor(e,n){this._clientId=e,this._redirectUri=n,this._code=null,this._tokenInfo=null,this._obtainedAt=null,this._inprogress=!1,this._inprogressPromises=[],this._codeChallenge=null,this._localStorageKey=null}persist(e){this._localStorageKey=e,this._restore(),this._persist()}_persist(){this._localStorageKey&&localStorage.setItem(this._localStorageKey,JSON.stringify({codeChallenge:this._codeChallenge,tokenInfo:this._tokenInfo,code:this._code,obtainedAt:this._obtainedAt}))}_restore(){if(!this._localStorageKey)return;let e;try{e=JSON.parse(localStorage.getItem(this._localStorageKey))}catch(n){localStorage.removeItem(this._localStorageKey),e=null}if(null===e)return;let{codeChallenge:n,tokenInfo:t,code:r,obtainedAt:o}=e;this._codeChallenge=n,this._tokenInfo=t,this._code=r,this._obtainedAt=o}generateAuthLink(){this._codeChallenge="";for(let n=0;n<64;n++)this._codeChallenge+=(e=a)[r(e.length-1)];var e;let n=`https://www.dropbox.com/oauth2/authorize?client_id=${this._clientId}&response_type=code&token_access_type=offline&code_challenge=${this._codeChallenge}&code_challenge_method=plain`;return this._redirectUri&&(n+="&redirect_uri="+encodeURIComponent(this._redirectUri)),this._persist(),n}setCode(e){if(null!==this._code)throw new Error("Code has already been set");this.reset(),this._code=e,this._persist()}reset(){this._code=null,this._tokenInfo=null,this._obtainedAt=null,this._persist()}token(e,n){if(this._inprogress)return this._addToWaitList().then(()=>this.token(e,n));if(null!==this._code)return this._exchangeForCode();if(e)return this._refresh(n);if(null!==this._tokenInfo)return(new Date).getTime()-this._obtainedAt>=this._tokenInfo.expires_at?this._refresh():Promise.resolve(this._tokenInfo.access_token);throw new Error("Authorization code is not present and it is not a refresh call")}present(){return null!==this._code||null!==this._tokenInfo}_exchangeForCode(){let e=new URLSearchParams;return e.append("code",this._code),e.append("grant_type","authorization_code"),e.append("code_verifier",this._codeChallenge),this._codeChallenge=null,this._redirectUri&&e.append("redirect_uri",this._redirectUri),e.append("client_id",this._clientId),this._code=null,this._startProgress(),fetch("https://api.dropboxapi.com/oauth2/token",{method:"POST",body:e,mode:"cors"}).then(e=>{if(!e.ok)throw new Error("Can't exchange token for code");return this._obtainedAt=(new Date).getTime(),e.json()}).then(e=>(this._tokenInfo=e,this._endProgress(),this._persist(),this._tokenInfo.access_token))}_startProgress(){if(this._inprogress)throw new Error("Already in progress");if(this._inprogressPromises.length>0)throw new Error("Wait list is not empty");this._inprogress=!0}_endProgress(){let e=this._inprogressPromises.splice(0,this._inprogressPromises.length);this._inprogress=!1;for(let n of e)n()}_addToWaitList(){return new Promise(e=>{this._inprogressPromises.push(e)})}_refresh(e){if(null===this._tokenInfo&&!e)throw new Error("No refresh token either passed or stored");this._startProgress();let n=new URLSearchParams;n.append("refresh_token",e||this._tokenInfo.refresh_token),n.append("grant_type","refresh_token"),n.append("client_id",this._clientId);let t=this._tokenInfo;return this._tokenInfo=null,fetch("https://api.dropboxapi.com/oauth2/token",{method:"POST",body:n,mode:"cors"}).then(e=>{if(!e.ok)throw new Error("Can't refresh token");return this._obtainedAt=(new Date).getTime(),e.json()}).then(e=>(this._endProgress(),this._tokenInfo=Object.assign(t,e),this._persist(),this._tokenInfo.access_token))}}("6zhy69g9ly8zaua",window.location.href.replace(/\?.*$/,""));E.persist("dropboxAuth");let z=new class{constructor(e){this._auth=e}list(e){return this._withToken(n=>fetch("https://api.dropboxapi.com/2/files/list_folder",{method:"POST",headers:{Authorization:"Bearer "+n,"Content-Type":"application/json"},body:JSON.stringify({path:e,recursive:!1,include_deleted:!1,include_has_explicit_shared_members:!1,include_mounted_folders:!0,include_non_downloadable_files:!1}),mode:"cors"})).then(({entries:e,cursor:n,has_more:t})=>t?this._listTheRest(n).then(n=>(n.forEach(n=>e.push(n)),e)):e).then(e=>e.map(e=>e.name))}_listTheRest(e){let n=[];const t=(e,r)=>this._withToken(n=>fetch("https://api.dropboxapi.com/2/files/list_folder/continue",{method:"POST",headers:{Authorization:"Bearer "+n,"Content-Type":"application/json"},body:JSON.stringify({cursor:e}),mode:"cors"})).then(({entries:e,cursor:o,has_more:i})=>{e.forEach(e=>n.push(e)),i?t(o,r):r(n)});return new Promise(n=>t(e,n))}download(e){return this._withToken(n=>fetch("https://content.dropboxapi.com/2/files/download",{method:"POST",headers:{"Dropbox-API-Arg":l({path:e}),Authorization:"Bearer "+n},mode:"cors"}),e=>e.text())}upload(e,n){return this._withToken(t=>fetch("https://content.dropboxapi.com/2/files/upload",{method:"POST",headers:{"Dropbox-API-Arg":l({path:e,mode:"add",autorename:!1,mute:!0,strict_conflict:!0}),Authorization:"Bearer "+t,"Content-Type":"application/octet-stream"},body:n,mode:"cors"}))}_withToken(e,n,t){return n=n||(e=>e.json()),this._auth.token().then(e).then(r=>{if(r.ok)return n(r);if(401==r.status){if(t)throw new o("Token refresh failed");return this._auth.token(!0).then(()=>this._withToken(e,n,!0))}if(409==r.status)throw new i("Conflict");return Promise.reject("HTTP status: "+r.status)})}}(E),S=new class{constructor(e){this._dropbox=e,this._templates=new Map}loadTemplates(){return this._dropbox.list("/.templates").then(e=>Promise.all(e.map(e=>this._dropbox.download("/.templates/"+e))).then(e=>e.forEach(e=>this._addTemplate(d.a.unserialize(e))))).catch(e=>{if(!(e instanceof i))throw e})}addTemplate(e){let n=`/.templates/${e.name}.json`;return this._dropbox.upload(n,d.a.serialize(e)).catch(e=>{if(e instanceof i)throw new Error("You are making notes too frequently. Calm down a bit.");throw e}).then(()=>{this._addTemplate(e)})}_addTemplate(e){this._templates.set(e.name,e)}createNote(e){let n=this._templates.get(e);if(void 0===n)throw new Error("No such template: "+e);return new b(n,this)}_saveNote(e){let n,t=new Date,r=g(t.getMonth()+1),o=g(t.getDate()),a=g(t.getHours()),s=g(t.getMinutes()),l=g(t.getSeconds()),d=`/${t.getFullYear()}/${r}/${o}/${a}:${s}:${l}.md`;try{n=e.toText()}catch(e){if(e instanceof m)return Promise.reject(e);throw e}return this._dropbox.upload(d,n).catch(e=>{if(e instanceof i)throw new Error("You are making notes too frequently. Calm down a bit.");throw e})}}(z),L=new URLSearchParams(window.location.search).get("code");function T(e,n){n=n||document.body;let t=document.createElement("mark");t.classList.add("message"),t.innerText=e,n.after(t),setTimeout(()=>t.parentNode.removeChild(t),3e3)}function I(e,n){null!==n.nextSibling&&n.nextSibling.classList&&n.nextSibling.classList.contains("error")&&n.nextSibling.parentNode.removeChild(n.nextSibling),n.classList.add("error");let t=document.createElement("mark");t.classList.add("error"),t.classList.add("message"),t.innerText=e,n.after(t)}L&&(E.setCode(L),history.replaceState({},"",window.location.pathname)),v.style.display="none",k.style.display="none",E.present()?w(S.loadTemplates().then(()=>{if(0==S._templates.size)return function(){let e=[],n=new f("Как прошёл день");return n.addField("Спорт",new p(["Тайчи","Велик"],!0)),n.addField("Голова",new h("Болела","Не болела")),n.addField("Шея",new h("Болела","Не болела")),n.addField("Приступ",new p(["Нет","Несильно","Сильно"],!0)),n.addField("Алкоголь",new p(["Нет","Немного","Да"])),n.addField("Заметки",new u({optional:!0,rows:5})),e.push(n),n=new f("Дневничок"),n.addField("Заметки",new u({rows:5})),e.push(n),w(Promise.all(e.map(e=>S.addTemplate(e))))}()}).then((function(){v.style.display="none",k.style.display="block",A("noteFields").innerHTML="";let e=document.createElement("option");e.value="",e.text="Select a template",j.add(e,null),S._templates.forEach(e=>{let n=document.createElement("option");n.value="",n.text=e.name,n._template=e,j.add(n,null)})}))):(v.style.display="block",k.style.display="none"),y.onclick=()=>{y.style.display="none",function(e,n){if(n){let n=window.open(e,"dropboxauth");return null==n?(T("Please allow pop-ups and reload the page"),null):(n.focus(),()=>n.close())}window.location=e}(E.generateAuthLink())};let P,N=new Map;const j=A("noteTemplate");function A(e){return document.getElementById(e)}C.disabled=!0,j.onchange=()=>{C.disabled=!0;let e=A("noteFields");e.innerHTML="",N.clear(),j.selectedIndex<1||(C.disabled=!1,P=j.options[j.selectedIndex]._template,P.getAllFields().forEach((n,t)=>{let o=n.toHtmlElement();if(o.id="id"+r(0,1<<30),o.required=!n._optional,N.set(t,o),o.onchange=()=>{o.classList.remove("error")},"INPUT"==o.tagName&&"checkbox"==o.type){let n=document.createElement("label"),r=document.createTextNode(" "+t);n.htmlFor=o.id,n.appendChild(r);let i=document.createElement("p");i.appendChild(o),i.appendChild(n),e.appendChild(i)}else{let n=document.createElement("label");n.htmlFor=o.id,n.innerText=t;let r=document.createElement("p");r.appendChild(n),r.appendChild(o),e.appendChild(r)}}))},C.onclick=()=>{let e=S.createNote(P.name),n=!0;try{for(let e of k.querySelectorAll(".error + mark"))e.parentNode.removeChild(e);N.forEach(e=>e.classList.remove("error")),N.forEach((n,t)=>e.setFieldValue(t,n.value))}catch(e){if(!(e instanceof m))throw e;{let t=N.get(e.name);I(e.message,t),n=!1}}n&&w(e.save().then(()=>T("Created!",C)).then(()=>{j.selectedIndex=0,j.onchange()}).catch(e=>{if(e instanceof o)return E.reset(),T("ERROR: Unauthorized. Please authorize Dropbox"),v.style.display="block",void(k.style.display="none");if(e instanceof m){let n=N.get(e.name);I(e.message,n)}else T("ERROR: "+e.toString(),C)}),k)}}]);
//# sourceMappingURL=app.c138e8265efafce4ad80.js.map