let start=null,end=null;
let N=10,M=10;
let gridClear=true;
let ongoing=false;
let wall=false;
let dr=[0,-1,1,0,1,-1,1,-1],dc=[1,0,0,-1,1,1,-1,-1];
let rightClicked=false;
let found=false;
let pre=[];
let algo='';
let weighted=false;
let weights;
let totalVisited=0,leftInQueue=0,dis=0,timeTaken=0;

async function Main(){
    customSelect();
    makegrid();
    weights=new Array(N*M).fill(1);
    document.addEventListener("click",closeAllSelect);
    document.querySelectorAll('.btn').forEach(el=>el.onclick=handleButtons);
    let z=uniqueRandInts(0,N*M,2);
    addStart('col-'+z[0]);
    addEnd('col-'+z[1]);
    await sleep(20);
    toast.fire({title:'Click to add Start node',text:'Right Click to add end node',timer:1500,icon:'info'});
}

function clearGrid(resetWeightsArray=false) { //clear ALL
    if(weighted&&resetWeightsArray) {
        for(let i=0;i<weights.length;i++) weights[i]=1;
    }
    start=end=null;
    document.querySelectorAll('.cell').forEach(y=>{
        y.removeEventListener('click',handleClick);
        if(y.classList.contains('weight')) y.removeEventListener("click",handleCtrlClick);
        y.removeEventListener('contextmenu',handleRightClick);
        y.className='cell';
        y.innerText='';
        y.removeAttribute('title');
        y.addEventListener('click',handleClick);
        y.addEventListener('contextmenu',handleRightClick);
    });
    weighted=false;
    gridClear=true;
}

function recreateGrid({readdWalls=true,readdWghts=false}={}) {
    let tstart=start,toEnd=end,twall=document.querySelectorAll('.cell.wall');
    clearGrid(!readdWghts);
    if(readdWghts) {
        weighted=true;
        for(let i=0;i<weights.length;i++)
        addWeight(i);
    }
    if(tstart!=null) addStart(tstart);
    if(toEnd!=null) addEnd(toEnd);
    if(readdWalls) twall.forEach(e=>addWall(e.id));
}

const toast=Swal.mixin({
    icon:'error',
    iconColor: 'white',
    customClass: {
        popup: 'colored-toast'
    },
    showConfirmButton:false,
    showCloseButton:true,
    title:'Please wait for the algorithm to finish',
    toast:true,
    position:'bottom-right',
    timer: 1000,
    timerProgressBar:false
});
function cntr(){window.scrollTo({top:document.querySelector('header').offsetHeight,left:0,behavior:'smooth'});}
function handleButtons(e) {
    if(ongoing) {
        toast.fire();
        return;
    }
    Swal.close();
    let btn=e.target.id;
    if(wall||btn=='wallbtn') { //if wall switch is turned on before starting any other operation,turn off
        wallswitch();
        if(btn=='wallbtn') return; //if it was turned off, dont turn on 
    }
    if(btn=='startbtn') startAlgo();
    else if(btn=='weightbtn') randomWeights();
    else if(btn=='randwalls') randomWalls();
    else if(btn=='randmaze') createMaze();
    else if(btn=='removewalls') removeAllWalls();
    else if(btn=='reset') clearGrid(true);
}

function msToTime(ms) {
    let seconds = (ms / 1000).toFixed(2);
    let minutes = (ms / (1000 * 60)).toFixed(1);
    let hours = (ms / (1000 * 60 * 60)).toFixed(1);
    let days = (ms / (1000 * 60 * 60 * 24)).toFixed(1);
    if (seconds < 60) return seconds + " Sec";
    if (minutes < 60) return minutes + " Min";
    if (hours < 24) return hours + " Hrs";
    return days + " Days";
}
  

async function startAlgo() {
    if(ongoing) {
        toast.fire();
        return;
    }
    if(start==null||end==null) {
        toast.fire({title:'Please select Start and End nodes first'});
        return;
    }
    if(!algo.length){
        toast.fire({title:'Select an algorithm first',timer:1500});
        await sleep(50);
        document.querySelector('.select-selected').click();
        return;
    }
    cntr();
    ongoing=true;
    if(!gridClear) {
        recreateGrid({readdWghts:weighted});
    }
    found=false;
    totalVisited=0;
    leftInQueue=0;
    pre=new Array(N*M);
    const begin=+start.slice(4),finish=end.slice(4);
    let x1=~~(begin/M),y1=begin%M,x2=~~(finish/M),y2=finish%M;

    let startTime=performance.now();
    //start algo here
    if(algo=='bellman') {
        await bellmanford(x1,y1,x2,y2);
        timeTaken='unmeasured';
    }else{
        if(algo=='bfs') await bfs(x1,y1,x2,y2);
        else if(algo=='dfs') await dfsUtil(x1,y1,x2,y2);
        else if(algo=='dijkstra') await dijkstra(x1,y1,x2,y2);
        else if(algo=='bestfs') await bestfirstsearch(x1,y1,x2,y2);
        timeTaken=msToTime(performance.now()-startTime);
    }
    //end algo
    gridClear=false;
    if(!found){
        // console.log('here '+found);
        Swal.fire({
            title: '<strong>Sorry</strong>',
            icon: 'error',
            text: 'There exists no path to the destination',
            showDenyButton: true,
            confirmButtonText:'Try Again?',
            denyButtonText:'Later',
        }).then(result=>(result.isConfirmed?recreateGrid({readdWalls:false,readdWghts:weighted}):null));
    }
    else{
        toast.fire({title:'FOUND',icon:'success',timer:1500,timerProgressBar:true});
        let path=reconstructPath(begin,finish);
        dis=path.length-1;
        let cost=-weights[begin];
        let tosleep=dis<100?450:0;
        while(path.length){
            let z=path.pop();
            cost+=weights[z];
            finalpath(z);
            await sleep(12);
        }
        let msg=algo=='dfs'?'Current path':'Shortest path',pathType='distance';
        if(weighted){msg='Minimum';pathType='cost';dis=cost;}
        await sleep(tosleep);
        toast.fire({
            title: `${msg} ${pathType} : ${dis}`,
            text:'Click the path for more info.',
            icon:'info',
            timer: 2000,
        });

    }
    ongoing=false;
    return;
}

async function wallswitch() {
    if(wall) {
        disbaleWallMode();
    } else {
        enableWallMode();
        cntr();
        toast.fire({icon:'info',title:'Click on cells to add walls',text:'Right Click to add multiple walls',timer:2000});
        // toast.fire({icon:'info',title:'Right Click to add multiple walls',timer:1500});
    }
    wall=!wall;
}

function enableWallMode(){
    document.querySelector('#wallbtn').classList.replace('addWallBtn','wallMode');
    document.querySelectorAll('.cell').forEach(el=>(el.id!=start&&el.id!=end)?el.classList.add('wallHover'):null);
}
function disbaleWallMode(){
    document.querySelector('#wallbtn').classList.replace('wallMode','addWallBtn');
    if(rightClicked) {
        disableWallHoverMode();
    }
    document.querySelectorAll('.cell').forEach(el=>el.classList.remove('wallHover'));
}

function addWall(id){
    //id= col-123 console.log for confunsion
    if(start!=id&&end!=id)
        document.querySelector('#'+id).classList.add('wall');
}

function removeAllWalls(){
    recreateGrid({readdWalls:false,readdWghts:weighted});
}

function removeAllWeights() {
    recreateGrid({readdWghts:false}); //weighted set to false here
}

function removeWall(id){
    document.querySelector('#'+id).classList.remove('wall');
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

function addWeight(id){
    let z=document.querySelector('#col-'+id);
    if(z.classList.contains('wall')) return;
    z.classList.add('weight');
    z.innerText=weights[id];
    z.addEventListener("click",handleCtrlClick);
}

async function handleCtrlClick(e){
    e.preventDefault();
    if(ongoing) {toast.fire();return;}
    if (window.event.ctrlKey) {
        if(e.target.id===start) {toast.fire({icon:'info',title:'Weight of starting node is always 0'});return;}
        let v;
        const {value: newWeight}= await Swal.fire({
            title:'Change Weight',
            input:'text',
            inputLabel:'Enter number between 1 and 99',
            showCloseButton:true,
            showCancelButton:true,
            inputValidator: value=>{
                if (!value) {
                  return 'You need to write something!';
                }
                if(isNaN(value)) return 'Enter a valid number!';
                v=+value;
                if(v<=0) return 'Weight cannot be 0 or negative';
                if(v>99) return 'Weight must be less than 100 (for display reasons)';
            }
        });
        if(newWeight) {
            e.target.innerText=v;
            let id=+e.target.id.slice(4);
            weights[id]=v;
        }
    }
}

const isWall=(rr,cc)=>document.querySelector('#col-'+(rr*M+cc)).classList.contains('wall');

function randomWalls() {
    cntr();
    recreateGrid({readdWalls:false,readdWghts:weighted});
    let percent=Math.random()*0.2+0.1;
    let obstacles=~~(N*M*percent);
    let rands=uniqueRandInts(0,N*M,obstacles);
    rands.forEach(el=>addWall('col-'+el));
}

async function randomWeights() {
    ongoing=true;
    cntr();
    clearGrid();
    weighted=true;
    toast.fire({icon:'info',title:'Adding Random Weights',timer:(N+M)*10});
    for(let j=0;j<M;j++) {
        for(let i=0;i<N;i++) {
            let x=i*M+j;
            weights[x]=(~~(Math.random()*98))+1;
            addWeight(x);
        }
        await sleep(10);
    }
    toast.fire({icon:'success',title:'Random Weights Added',text:'CTRL+Click to change',timer:2500});
    ongoing=false;
}
class queue {
    constructor(size=10) {
        this.len=0;
        this.q=new Array(size);
        this.front=0;
        this.rear=0;
    }
    isEmpty() {
        return this.front===this.rear;
    }
    size(){
        return this.len;
    }
    push(el){
        this.len++;
        this.q[this.rear++]=el;
    }
    pop(){
        this.len--;
        return this.q[this.front++];
    }
}

let _top=0;
class PriorityQueue {
    parent(i) {
        return ((i + 1) >>> 1) - 1;
    }
    left(i) {
        return (i << 1) + 1;
    }
    right(i) {
        return (i + 1) << 1;
    }
    constructor(comparator=(a,b)=>a[0]!=b[0]?(a[0]<b[0]):(a[1]<b[1])) {
        this._heap = [];
        this._comparator = comparator;
    }
    size() {
        return this._heap.length;
    }
    isEmpty() {
        return this.size() == 0;
    }
    peek() {
        return this._heap[_top];
    }
    push(...values) {
        values.forEach(value => {
            this._heap.push(value);
            this._siftUp();
        });
        return this.size();
    }
    pop() {
        const poppedValue = this.peek();
        const bottom = this.size() - 1;
        if (bottom > _top) {
        this._swap(_top, bottom);
        }
        this._heap.pop();
        this._siftDown();
        return poppedValue;
    }
    replace(value) {
        const replacedValue = this.peek();
        this._heap[_top] = value;
        this._siftDown();
        return replacedValue;
    }
    _greater(i, j) {
        return this._comparator(this._heap[i], this._heap[j]);
    }
    _swap(i, j) {
        [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
    }
    _siftUp() {
        let node = this.size() - 1;
        while (node > _top && this._greater(node, this.parent(node))) {
            this._swap(node, this.parent(node));
            node = this.parent(node);
        }
    }
    _siftDown() {
        let node = _top;
        while (
        (this.left(node) < this.size() && this._greater(this.left(node), node)) ||
        (this.right(node) < this.size() && this._greater(this.right(node), node))
        ) {
        let maxChild = (this.right(node) < this.size() && this._greater(this.right(node), this.left(node))) ? this.right(node) : this.left(node);
        this._swap(node, maxChild);
        node = maxChild;
        }
    }
}

async function bestfirstsearch(x1, y1, x2, y2) {
    let begin=x1*M+y1,finish=x2*M+y2,n=N*M;
    let heuristic = new Array(n);
    let q=new PriorityQueue((a,b)=>heuristic[a[1]]<heuristic[b[1]]);
    let vis=new Array(n);
    heuristic[begin]=(Math.abs(x2-x1)+Math.abs(y2-y1))*weights[begin]+weights[finish];
    q.push([0,begin]);
    color(begin);
    while(!q.isEmpty()) {
        let a=q.pop()[1],r=~~(a/M),c=a%M;
        if(vis[a]) continue;
        vis[a]=true;
        markVis(a);
        await sleep(10);
        totalVisited++;
        if(a==finish){
            found=true;
            leftInQueue=q.size();
            break;
        }
        for(let k=0;k<4;k++) {
            let rr=r+dr[k],cc=c+dc[k],b=rr*M+cc;
            if(rr<0||cc<0||rr>=N||cc>=M||isWall(rr,cc)||vis[b]) continue;
            heuristic[b]=(Math.abs(rr-x2)+Math.abs(cc-y2))*weights[b]+weights[a];
            pre[b]=a;
            q.push([weights[b],b]);
            color(b);
            await sleep(1);
        }
    }
}

async function dijkstra(x1,y1,x2,y2){
    const INF=1e9;
    let n=N*M,count=0;
    let begin=x1*M+y1,finish=x2*M+y2;
    let q=new PriorityQueue();
    let dis=new Array(n);
    let vis=new Array(n);
    for(let i=0;i<n;i++) dis[i]=INF;
    dis[begin]=0;
    q.push([0,begin]);
    color(begin);
    while(!q.isEmpty()){
        let a=q.pop()[1];
        if(vis[a]) continue;
        vis[a]=true;
        count++;
        let r=~~(a/M),c=a%M;
        markVis(a);
        await sleep(10);
        totalVisited++;
        if(a==finish) {found=true;leftInQueue=q.size();break;}
        for(let k=0;k<4;k++){
            let rr=r+dr[k],cc=c+dc[k];
            let b=rr*M+cc,w=weights[b];
            if(rr<0||cc<0||rr>=N||cc>=M||isWall(rr,cc)||vis[b]) continue;
            if(dis[a]+w<dis[b]) {
                dis[b]=dis[a]+w;
                pre[b]=a;
                q.push([dis[b],b]);
                color(b);
                await sleep(1);
            }
        }
    }
    if(!found) count=-1;
    return count;
}


async function dfsUtil(x1,y1,x2,y2) {
    if(weighted) {
        await Swal.fire({
            title:'Removing All Weights...',
            text:'DFS cannot find shortest path on weighted graph',
            icon:'error',
            timer:1500
        });
        removeAllWeights();
    }
    await dfs(x1,y1,x2,y2,new Array(N*M));
}
async function dfs(x1,y1,x2,y2,vis,dir=[[-1,0],[1,0],[0,1],[0,-1]]) {
    if(found) return;
    let currNode=x1*M+y1;
    if(vis[currNode]) return;
    vis[currNode]=true;
    color(currNode);
    await sleep(10);
    // await sleep(25);
    if(x1===x2&&y1===y2) found=true;
    markVis(currNode);
    await sleep(1);
    totalVisited++;
    for(let k=0;k<4;k++){
        let rr=x1+dir[k][0],cc=y1+dir[k][1],toVisitNode=rr*M+cc;
        if(rr<0||cc<0||rr>=N||cc>=M||isWall(rr,cc)||vis[toVisitNode]) continue;
        await dfs(rr,cc,x2,y2,vis);
        pre[toVisitNode]=currNode;
    }
}

async function bfs(x1,y1,x2,y2) {
    if(weighted) {
        await Swal.fire({
            title:'Removing All Weights...',
            text:'BFS cannot find shortest path on weighted graph',
            icon:'error',
            timer:1000
        });
        removeAllWeights();
    }
    let q=new queue(N*M),vis=new Array(N*M);
    // let toColor=[];
    q.push([x1,y1]);
    vis[x1*M+y1]=1;
    color(x1*M+y1);
    while(!q.isEmpty()) {
        let z=q.pop(),r=z[0],c=z[1];
        markVis(r*M+c);
        await sleep(10);
        totalVisited++;
        if(r==x2&&c==y2){
            found=true;
            leftInQueue=q.size();
            return;
        }
        for(let i=0;i<4;i++) {
            let rr=r+dr[i],cc=c+dc[i],curr=rr*M+cc;
            if(rr<0||cc<0||rr>=N||cc>=M||vis[curr]) continue;
            if(isWall(rr,cc)) continue;
            q.push([rr,cc]);
            vis[curr]=true;
            pre[curr]=r*M+c;
            color(curr);
            await sleep(1);
        }
    }
    return -1;
}

async function bellmanford(x1,y1,x2,y2) {
    let sq='2'.sup();
    await Swal.fire({
        title:'Note',
        html:`This is a very slow algorithm with O(N*M) time complexity.<br> Only changes will be visualized`,
        icon:'warning',
        timer:1000
    });
    const n=N*M,INF=Infinity;
    let dis=new Array(n),begin=x1*M+y1,finish=x2*M+y2;
    let edgeList=[];
    for(let i=0;i<N;i++){
        for(let j=0,r=i*M;j<M;j++) {
            if(isWall(i,j)) continue;
            for(let k=0,a=r+j;k<4;k++){
                let rr=i+dr[k],cc=j+dc[k],b=rr*M+cc;
                if(rr<0||cc<0||rr>=N||cc>=M||isWall(rr,cc)) continue;
                edgeList.push([a,b,weights[b]]);
                document.querySelector('#col-'+b).classList.add('visited');
            }
        }
        await sleep(1);
    }
    for(let i=0;i<n;i++) dis[i]=INF;
    dis[begin]=0;
    for(let l=1;l<n;l++) {
        let p=false;
        for(let e of edgeList) {
            totalVisited++;
            let [a,b,w]=e;
            if(dis[a]+w<dis[b]) {
                p=true;
                dis[b]=dis[a]+w;
                pre[b]=a;
                let o=document.querySelector('#col-'+a).classList,o2=document.querySelector('#col-'+b).classList;
                o.add('bellmanford');o2.add('bellmanford');
                await sleep(10);
                o.remove('bellmanford');o2.remove('bellmanford');
                await sleep(7);
                if(b==finish) found=true;
            }
        }
        if(!p) break;
    }
}

function reconstructPath(begin,finish) {
    let path = [];
    for (let at=finish;at!=null;at=pre[at]) path.push(at);
    if (path[path.length-1]!=begin) return ['NO PATH FOUND'];
    // console.log(...path);
    return path;
}
function finalpath(id){
    let el=document.querySelector('#col-'+id);
    el.classList.replace('visited','finalpath');
    el.title="Final Path";
}
function markVis(a){
    // let [x,y]=a;
    let id='#col-'+a;
    document.querySelector(id).classList.replace('visiting','visited');
}

function color(a){
    // let [x,y]=a;
    let id='#col-'+a;
    document.querySelector(id).classList.add('visiting');
}

function handleClick(e){
    e.preventDefault();
    if(ongoing) {toast.fire();return;}
    if (weighted&&window.event.ctrlKey) return;
    if(rightClicked) {
        disableWallHoverMode();
        return;
    }
    let s=e.target,tostart=e.target.id;
    if(s.classList.contains('finalpath')&&!wall){
        let pathType=weighted?'Cost':'Distance';
        Swal.fire({
            title:'INFO',
            html:`
                <div>
                    <div class="cn">
                        <p class="t infoCell grn"></p>
                        <p class="t" id="tt">Total Visited: ${totalVisited}</p>
                    </div>
                    <div class="cn">
                        <p class="t infoCell ylw"></p>
                        <p class="t" id="tt"> Left In Queue: ${leftInQueue} </p>
                    </div>
                    <div class="cn">
                        <p class="t infoCell orng"></p>
                        <p class="t" id="tt">${pathType}: ${dis}</p>
                    </div>
                    <div class="cn">
                        <p class="t" id="tt">Time Taken: ${timeTaken}</p>
                    </div>
                </div>`,
            showCloseButton:true,
            icon:'question'
        });
        return;
    }
    if(!gridClear) {
        recreateGrid({readdWghts:weighted});
        if(wall) enableWallMode();
    }
    if(wall) {
        if(start===tostart||end===tostart){
            toast.fire({title:'Start and End Node cannot contain walls',timer:2000});
            return;
        }
        if(s.classList.contains('wall')) removeWall(tostart);
        else addWall(tostart);
        return;
    }
    if(s.classList.contains('wall')){
        toast.fire({title:'Start Node cannot be a wall'});
        return;
    }
    if(e.target.id===end) {
        toast.fire({title:'Start and End Nodes cannot be same',icon:'warning'});
        return;
    }
    if(start!=null) {
        let z=document.querySelector('.cell.start');
        z.classList.remove('start');
        z.removeAttribute("title");
        if(!weighted) z.innerText="";
        else z.innerText=weights[+start.slice(4)]; //(See addStart func) if weight was set to 0, readd weight
        if(start===e.target.id) {start=null;return;}
    }
    addStart(tostart);
}

function handleRightClick(e){
    e.preventDefault();
    closeAllSelect();
    if(ongoing) {toast.fire();return;}
    if(wall) {
        handleRightHover(e);
        return;
    }
    if(!gridClear) {
        recreateGrid({readdWghts:weighted});
        // if(wall) enableWallMode();
    }
    let toend=e.target.id,el=e.target;
    if(start===toend) {
        toast.fire({title:'Start and End Nodes cannot be same',icon:'warning'});
        return;
    }
    if(el.classList.contains('wall')){
        toast.fire({title:'End Node cannot be a wall'});
        return;
    }
    if(end!=null) {
        let z=document.querySelector('.cell.end');
        z.classList.remove('end');
        z.removeAttribute("title");
        if(!weighted) z.innerText="";
        if(end===e.target.id) {end=null;return;}
    }
    addEnd(toend);
}

function disableWallHoverMode(){
    rightClicked=false;
    document.querySelectorAll('.cell').forEach(col=>{
        col.removeEventListener('mouseover',hoverAddWall);
    });
}

function handleRightHover(e){
    e.preventDefault();
    if(start===e.target.id||end===e.target.id){
        toast.fire({title:'Start and End Node cannot contain walls',timer:2000});
        return;
    }
    if(!gridClear) {recreateGrid({readdWghts:weighted}); enableWallMode();}
    if(rightClicked) {
        disableWallHoverMode();
        return;
    }
    rightClicked=true; //enable hover mode
    document.querySelectorAll('.cell').forEach(col=>{
        col.addEventListener('mouseover',hoverAddWall);
    });
}

function hoverAddWall(ev){
    addWall(ev.target.id);
}

function addEnd(toend){
    end=toend;
    let d=document.querySelector(`div[id=${end}]`);
    d.classList.add('end');
    d.title="End Node";
    if(!weighted) d.innerText="E";
}


function addStart(tostart){
    start=tostart;
    let d=document.querySelector(`div[id=${start}]`);
    d.classList.add('start');
    d.title="Start Node";
    if(!weighted) d.innerText="S";
    else d.innerText=0; //if weighted, start node's weight is 0
}

const randInt=(mn,mx)=>~~(Math.random()*(mx-mn))+mn;

function uniqueRandInts(mn,mx,size=0){  //mn <= x < mx
    mx=Math.max(mx,size+mn);
    if(size==0) size=mx-mn;
    let a=[],b=new Array(size),c=0;
    let rand = randInt(mn,mx);
    while(c<size){
        while(b[rand]) rand=randInt(mn,mx);
        b[rand]=true;
        c++;
        a.push(rand);
    }
    return a;
}

async function createMaze(){
    ongoing=true;
    cntr();
    toast.fire({icon:'info',title:'Generating Random Maze',timer:N*M*4});
    clearGrid(true);
    for(let i=0;i<N;i++){
        for(let j=0;j<M;j++)
        addWall('col-'+(i*M+j));
        await sleep(10);
    }
    let r=randInt(0,N),c=randInt(0,M);
    await recursiveMaze(r,c);
    ongoing=false;
    toast.fire({icon:'success',title:'Done'});
}

async function recursiveMaze(r,c) {
    removeWall('col-'+(r*M+c));
    await sleep(10);
    let rands=uniqueRandInts(0,4);
    for(let inx of rands) {
        let rr=r+dr[inx]*2,cc=c+dc[inx]*2;
        if(rr<0||cc<0||rr>=N||cc>=M) continue;
        if (!isWall(rr,cc)) continue;
        let rrow=r+dr[inx],ccol=c+dc[inx];
        document.querySelector('#col-'+(rrow*M+ccol));
        removeWall('col-'+(rrow*M+ccol));
        await sleep(5);
        await recursiveMaze(rr,cc);
    }
}

function makegrid() {
    let h=window.innerHeight,w=window.innerWidth;
    N=~~((0.98*h)/30);M=~~((w-0.028*w)/30);
    N=Math.max(1,N);M=Math.max(1,M);
    let root = document.querySelector('.nodes');
    for (let i = 0; i < N; i++) {
        let row = document.createElement('div');
        row.id = 'row-' + i;
        for (let j = 0; j < M; j++) {
            let col = document.createElement('div');
            col.id = 'col-' + (i * M + j);
            row.appendChild(col).className = 'cell';
        }
        root.appendChild(row).className = 'node-row';
    }
    gridClear = true;
    document.querySelectorAll('.cell').forEach(y=>{
        y.addEventListener('click',handleClick);
        y.addEventListener('contextmenu',handleRightClick);
    });
}

function changeAlgo(x){
    let z={'bestfs':'Best','dfs':'Depth'};
    if(x=='bestfs'||x=='dfs'){
        Swal.fire('',z[x]+' First Search does not guarantee the shortest path','info');
    }
    algo=x;
}

function customSelect() {
    let x, i, j, l, ll, selElmnt, a, b, c;
    /* Look for any elements with the class "custom-select": */
    x = document.getElementsByClassName("custom-select");
    l = x.length;
    for (i = 0; i < l; i++) {
        selElmnt = x[i].getElementsByTagName("select")[0]; //grab select
        ll = selElmnt.length;
        /* For each element, create a new DIV that will act as the selected item: */
        a = document.createElement("DIV");
        a.setAttribute("class", "select-selected");
        a.innerHTML = selElmnt.options[selElmnt.selectedIndex].innerHTML;
        x[i].appendChild(a);
        // console.log(x[i]);
        /* For each element, create a new DIV that will contain the option list: */
        b = document.createElement("DIV");
        b.setAttribute("class", "select-items select-hide");
        for (j = 1; j < ll; j++) {
            /* For each option in the original select element,
            create a new DIV that will act as an option item: */
            c = document.createElement("DIV");
            c.innerHTML = selElmnt.options[j].innerHTML;
            c.id = (selElmnt.options[j].value); //set the value of option as ID
            c.addEventListener("click",updateSelectBox);
            b.appendChild(c);
        }
        x[i].appendChild(b);
        a.addEventListener("click",function(e){
            /* When the select box is clicked, close any other select boxes,
            and open/close the current select box: */
            e.preventDefault();
            e.stopPropagation();
            closeAllSelect(this);
            this.nextSibling.classList.toggle("select-hide");
            this.classList.toggle("select-arrow-active");
        });
    }
}

function updateSelectBox(e) {
    /* When an item is clicked, update the original select box,
    and the selected item: */
    e.preventDefault();
    changeAlgo(e.target.id); //(id set in line 557)algo set to the selected one
    let y, i, k, s, h, sl, yl;
    s = this.parentNode.parentNode.getElementsByTagName("select")[0];
    sl = s.length;
    h = this.parentNode.previousSibling;
    for (i = 0; i < sl; i++) {
        if (s.options[i].innerHTML == this.innerHTML) {
            s.selectedIndex = i;
            h.innerHTML = this.innerHTML;
            y = this.parentNode.getElementsByClassName("same-as-selected");
            yl = y.length;
            for (k = 0; k < yl; k++) {
                y[k].removeAttribute("class");
            }
            this.setAttribute("class", "same-as-selected");
            break;
        }
    }
    h.click();
}
function closeAllSelect(elmnt) {
    /* A function that will close all select boxes in the document,
    except the current select box: */
    let x, y, i, xl, yl, arrNo = [];
    x = document.getElementsByClassName("select-items");
    y = document.getElementsByClassName("select-selected");
    xl = x.length;
    yl = y.length;
    for (let i = 0; i < yl; i++) {
        if (elmnt == y[i]) {
            arrNo.push(i);
        } else {
            y[i].classList.remove("select-arrow-active");
        }
    }
    for (i = 0; i < xl; i++) {
        if (arrNo.indexOf(i)) {
            x[i].classList.add("select-hide");
        }
    }
}

document.addEventListener('DOMContentLoaded',Main);
// window.addEventListener('resize',()=>{toast.fire({title:'Page reloaded!',icon:'info'});location.reload();});