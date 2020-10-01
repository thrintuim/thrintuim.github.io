startSvgAltTextExtraction = function (evt) {
    'use strict';
    var key = evt.which || evt.keyCode;
    if (key === 115) {
        document.querySelectorAll("div.numberlineprinting").forEach((el) => {el.removeAttribute("role");});
        svgAltTextExtraction();
    }
};
document.addEventListener('keydown', startSvgAltTextExtraction.bind(this));
alert("Bookmarklet initialized.");
const mmlDOMParser = new DOMParser();
const descObserverConfig = {attributes: true, childList: true, characterData: true};
const svgObserverConfig = {childList: true, subTree: true};
const xpathe = new XPathEvaluator();
const descriptionsAndNoPosition = xpathe.createExpression("count(./descendant-or-self::*[child::s:title or child::s:desc][not(@data-pos)]) > 0", nsResolver);
const getContainersWithDescriptiveElements = xpathe.createExpression("./descendant-or-self::*[child::s:title or child::s:desc]", nsResolver);
const getAncestorSVG = xpathe.createExpression("./ancestor-or-self::s:svg", nsResolver);

function svgAltTextExtraction () {
  var containers = document.querySelectorAll(".QGraphContainer[style]");
  containers.forEach((cont) => {
    cont.style.height = "unset";
  });
  var svgs = document.querySelectorAll("svg");
  svgs.forEach(function(svg) {
    if (!hasNonEmptyLiveRegion(svg)) {
      initializeSVG(svg);
      o = new MutationObserver(svgObserver);
      o.observe(svg, svgObserverConfig);
    }
  });
}

function hasNonEmptyLiveRegion(svg) {
  let liveRegion = svg.nextElementSibling;
  return liveRegion !== null && liveRegion.className.includes("liveRegion") && liveRegion.children.length > 0;
}

function initializeSVG(svg) {
  let visDescLocations = svg.nextElementSibling;
  if (visDescLocations === null || !visDescLocations.className.includes("visDesc")) {
    visDescLocations = document.createElement("div");
    visDescLocations.className = "visDesc";
    visDescLocations.setAttribute("aria-live", "assertive");
    svg.insertAdjacentElement('afterend', visDescLocations);
  }
  let descContainers = returnNodeList(getContainersWithDescriptiveElements, svg, XPathResult.ORDERED_NODE_ITERATOR_TYPE);

  descContainers.forEach(initializeDescgroup, visDescLocations);
}

function returnNodeList(xpath, context, result) {
  results = xpath.evaluate(context, result, null);
  resultNodes = [];
  node = results.iterateNext();
  while(node) { resultNodes.push(node); node = results.iterateNext();}
  return resultNodes;
}

function returnNode(xpath, context, result) {
  let noderesult = xpath.evaluate(context, result, null);
  return noderesult.singleNodeValue;
}

function initializeDescgroup (descgroupel, descgrouppos) {
  if (!descgroupel.hasAttribute("data-pos")) {
    descgroupel.setAttribute("data-pos", descgrouppos);
    let tandd = Array.prototype.filter.call(descgroupel.children, child => child.localName === "title" || child.localName === "desc");
    if (this.children.length - 1 < descgrouppos) {
      let paragraph = document.createElement("p");
      this.appendChild(paragraph);
      tandd.forEach(initializeDescelement, paragraph);
      return true;
    }
    let currentVisDescChild = this.children[descgrouppos];
    if (currentVisDescChild.children.length !== tandd.length) {
      while (currentVisDescChild.children) { currentVisDescChild.removeChild(currentVisDescChild.children[0]);}
      tandd.forEach(initializeDescelement, currentVisDescChild);
      return true;
    }
    tandd.forEach(updateDescelement, currentVisDescChild);
  }
}

function initializeDescelement(descel) {
  let span = document.createElement("span");
  this.appendChild(span);
  mathJaxCorrection(descel, span);
  span.className = descel.localName;
  if (descel.localName === "title" && descel.nextElementSibling.localName === "desc") {
    span.insertAdjacentText("beforeend", ": ");
  }
  if (descel.localName === "desc") {
    let o = new MutationObserver(descriptionObserver);
    o.observe(descel, descObserverConfig);
  }
}

function updateDescelement(descel, index) {
  visDescEl = this.children[index];
  if (descel.textContent !== visDescEl.textContent) {
    mathJaxCorrection(descel, visDescEl);
    if (descel.localName === "desc") {
      let o = new MutationObserver(descriptionObserver);
      o.observe(descel, descObserverConfig);
    }
  }
}

function svgObserver(mutations) {
  let svg = mutations[0].target;
  if (descriptionsAndNoPosition.evaluate(svg, XPathResult.BOOLEAN_TYPE, null).booleanValue) {
    initializeSVG(svg);
  } 
}

function mathJaxCorrection(start, end) {
  mjpreviewNodes = start.getElementsByClassName("MathJax_Preview");
  if (mjpreviewNodes.length === 0){
    end.innerHTML = start.innerHTML;
  }
  else {
    let startClone = start.cloneNode(true);
    let clonedmjpnodes = startClone.getElementsByClassName("MathJax_Preview");
    Array.prototype.forEach.call(clonedmjpnodes, removeMathJaxmarkup);
    while (clonedmjpnodes.length) {
      clonedmjpnodes[0].parentElement.removeChild(clonedmjpnodes[0]);
    }
    end.innerHTML = startClone.innerHTML;
    MathJax.Hub.Queue(["Typeset", MathJax.Hub, end]);
  }
  return end;
}

function removeMathJaxmarkup(mjpnode) {
  let parent = mjpnode.parentElement;
  parent.removeChild(mjpnode.nextElementSibling);
  let scriptEl = mjpnode.nextElementSibling;
  if (scriptEl.textContent.match("<math>")) {
    let mmldoc = mmlDOMParser.parseFromString(scriptEl.textContent, "text/xml");
    mjpnode.insertAdjacentElement("afterend", mmldoc.documentElement);
  }
  else {
    mjpnode.insertAdjacentText("afterend", "\\(" + scriptEl.textContent + "\\)");
  }
  parent.removeChild(scriptEl);
}

function getvisibledesccontainerel(descgroupel) {
  let svg = returnNode(getAncestorSVG, descgroupel, XPathResult.FIRST_ORDERED_NODE_TYPE);
  let visDesc = svg.nextElementSibling;
  return visDesc;
}

function descriptionObserver(mutations) {
  let descgroup = mutations[0].target.parentElement;
  let despos = descgroup.getAttribute("data-pos");
  let visDescContainerEl = getvisibledesccontainerel(descgroup);
  let visDescEl = visDescContainerEl.children[despos].getElementsByClassName("desc")[0];
  mathJaxCorrection(mutations[0].target, visDescEl);
}

function nsResolver(prefix) {
    var ns = { 's': 'http://www.w3.org/2000/svg'};
    return ns[prefix] || null;
}