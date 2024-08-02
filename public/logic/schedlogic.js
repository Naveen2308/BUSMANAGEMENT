
async function insertTime (busId, time, busStop){
    const response = await fetch(`/coordinator/insertTime/${busId}/${time}/${busStop}`, { method: 'DELETE' });
    if(!response.ok){
    const errorMessage = await response.text();
    console.error('Failed to update Time');
    return ;
   }
}

function create_bus(busId,busData){
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = busId;
    details.appendChild(summary);
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    const th1 = document.createElement("th");
    const th2 = document.createElement("th");
    const th3 = document.createElement("th");
    th1.textContent = "Time";
    th2.textContent = "Bus Stop";
    th3.textContent = "ATime";
    tr.appendChild(th1);
    tr.appendChild(th2);
    tr.appendChild(th3);
    thead.appendChild(tr);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (const routeData of busData.route) {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        const td2 = document.createElement("td");
        const td3 = document.createElement("td");      
        const addBtn = document.createElement("button");        
        const addImg = document.createElement("img");
        addImg.src = "pics/plus.png";        
        addImg.alt = "Add";
        addBtn.classList.add("bus_btn");
        addBtn.appendChild(addImg);
        td1.textContent = routeData.time;
        td2.textContent = routeData.busstop;
        if(routeData.atime){
            td3.textContent = routeData.atime;
        }
        else{ 
            td3.appendChild(addBtn);
        }
        tr.appendChild(td1);
        tr.appendChild(td2);
        tr.appendChild(td3);
        tr.setAttribute('data-id',routeData.busstop);
        tbody.appendChild(tr);
       /* addBtn.addEventListener("click", () => {
            const confirmation = confirm(`Are you sure you want to add the bus timmings of  "${busId}" and "${routeData.busstop}" Stop?`);
            if (confirmation) {
                const currentTime = new Date();
                const hours = currentTime.getHours();
                const minutes = currentTime.getMinutes();
                const formattedTime = `${hours}:${minutes}`;
                routeData.atime = formattedTime;
                td3.textContent = routeData.atime;
                insertTime(busId,formattedTime, routeData.busstop);
            }
        });*/
        
        addBtn.addEventListener("click", () => {
            const confirmation = confirm(`Are you sure you want to add the bus timings of "${busId}" and "${routeData.busstop}" Stop?`);
            if (confirmation) {
                const currentTime = new Date();
                const hours = currentTime.getHours();
                const formattedHours = String(hours).padStart(2, '0');
                const minutes = currentTime.getMinutes();
                const formattedMinutes = String(minutes).padStart(2, '0');
                const formattedTime = `${formattedHours}:${formattedMinutes}`;
                routeData.atime = formattedTime;
                td3.textContent = routeData.atime;
                insertTime(busId, formattedTime, routeData.busstop);
            }
        });
        

        /*addBtn.addEventListener("click", () => {
            const confirmation = confirm(`Are you sure you want to add the bus timings of "${busId}" and "${routeData.busstop}" Stop?`);
            if (confirmation) {
                const currentTime = new Date();
                let hours = currentTime.getHours();
                const minutes = currentTime.getMinutes();
                let period = "AM";
        
                // Convert hours to 12-hour format and determine AM/PM
                if (hours > 12) {
                    hours -= 12;
                    period = "PM";
                } else if (hours === 12) {
                    period = "PM";
                } else if (hours === 0) {
                    hours = 12; // Midnight is 12:00 AM
                }
        
                // Pad the minutes with leading zero if it's a single digit
                const formattedHours = String(hours).padStart(2, '0');
                const formattedMinutes = String(minutes).padStart(2, '0');
                const formattedTime = `${formattedHours}:${formattedMinutes} ${period}`;
                routeData.atime = formattedTime;
                td3.textContent = routeData.atime;
                insertTime(busId, formattedTime, routeData.busstop);
            }
        });
        */
        
        
    }
    table.appendChild(tbody);
    details.appendChild(table);
    details.classList.add("bus");

    return details;
}


function loadData() {
    fetch("/coordinator/getbuses", { method: 'GET' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(dataId => {

            // Assuming dataId is an array of bus IDs or an object with bus IDs as keys
            // If it's an object, you can convert it to an array using Object.keys(dataId)
            fetch("/data/buses.json")
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to fetch buses.json');
                    }
                    return response.json();
                })
                .then(data => {
                    const detailsContainer = document.getElementById("bus-list");
                    for (const [busId, busData] of Object.entries(data)) {
                        if (dataId.includes(busId)) { 
                            const details=create_bus(busId,busData)
                            detailsContainer.appendChild(details);
                        }
                    }
                })
                .catch(error => console.error('Error fetching buses.json:', error));
        })
        .catch(error => {
            console.error('Error fetching /coordinator/buses:', error);
        });
}



function searchRoutes() {
    const source = document.getElementById("source").value.trim().toLowerCase();
    const destination = document.getElementById("destination").value.trim().toLowerCase();
    const detailsContainer = document.getElementById("bus-list");
    const details = detailsContainer.querySelectorAll(".bus");
    console.log(details)

    for( var i=0;i<details.length;i++)
    {
        const table = details[i].querySelector("table");
        const tbody = table.querySelector("tbody");
        const rows = tbody.querySelectorAll("tr");

        let passThroughSource = false;
        let passThroughDestination = false;
        let passThroughBoth=false;

        for(var j=0;j<rows.length;j++)
        {
            if(rows[j].getAttribute('data-id').trim().toLowerCase()==source) passThroughSource=true;
            if(rows[j].getAttribute('data-id').trim().toLowerCase()==destination && passThroughSource) {passThroughDestination=true; passThroughBoth=true;}
            else if(rows[j].getAttribute('data-id').trim().toLowerCase()==destination && !passThroughSource) {passThroughDestination=true;}

        }

        if(!source && !destination)
        {
            details[i].hidden=false
        }

        else if(source && destination)
        {
            if(!passThroughBoth){
                details[i].hidden=true
            }
            else{
                details[i].hidden=false
            }
        }
        else if(!source && destination)
        {
            if(!passThroughDestination){
                details[i].hidden=true
            }
            else{
                details[i].hidden=false
            }
            
        }
        else if(source && !destination)
        {
            if(!passThroughSource){
                details[i].hidden=true
            }
            else{
                details[i].hidden=false
            }
            
        }
    }
}

loadData();