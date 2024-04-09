let state = {
    "cur_drag": undefined,
    "cur_drag_offset": undefined
}

let events = {
    "click": [
        {
            "check": factory.is_id("add_student"),
            "action": () => {
                let element = document.getElementById("template__student__new").content.cloneNode(true)
                element.querySelector(".student").setAttribute("data-id", "APPEND")
                element.querySelector(".student").style.order = 100000
                document.getElementById("add_student").parentElement.insertBefore(
                    element,
                    document.getElementById("add_student"))
                document.querySelector(".student input").focus()
            }
        },
        {
            "check": factory.or(factory.has_class("student__complete"), (e) => {return e.parentElement.classList.contains("student__complete")}),
            "action": () => {
                CLIENT.CURCLASS.freeze()
            }
        },
        {
            "check": (e)=>{return e.classList.contains("student__delete") || e.parentElement.classList.contains("student__delete")},
            "action": (e) => {
                if (e.parentElement.classList.contains("student__delete")){
                    e = e.parentElement
                }
                CLIENT.CURCLASS.roster.remove(Number(e.parentElement.getAttribute("data-id")))
                e.parentElement.remove()
            }
        },
        {
            "check": (e)=>{
                return e.classList.contains("class-list__item") || e.parentElement.classList.contains("class-list__item")
                    || e.parentElement.parentElement.classList.contains("class-list__item")
            },
            "action": (e) => {
                if (e.parentElement.classList.contains("class-list__item")){
                    e = e.parentElement
                }else if (e.parentElement.parentElement.classList.contains("class-list__item")){
                    e = e.parentElement.parentElement
                }
                CLIENT.load_course(Number(e.getAttribute("data-id")))
            }
        },
        {
            "check": factory.is_id("sort__first_name"),
            "action": (e) => {
                CLIENT.CURCLASS.roster.roster.sort((a, b) => {
                    return (a.name.toLocaleLowerCase()).localeCompare(b.name.toLocaleLowerCase())
                })
                CLIENT.CURCLASS.roster.display()
                CLIENT.save()
            }
        },
        {
            "check": factory.is_id("sort__last_name"),
            "action": (e) => {
                CLIENT.CURCLASS.roster.roster.sort((a, b) => {
                    return (a.name.toLocaleLowerCase().split(" ").at(-1)).localeCompare(b.name.toLocaleLowerCase().split(" ").at(-1))
                })
                CLIENT.CURCLASS.roster.display()
                CLIENT.save()
            }
        },
        {
            "check": factory.has_class("edit__name"),
            "action": async () => {
                let promise
                try{
                    promise = await ask("Change Class Name", "", {"value": CLIENT.CURCLASS.name})
                }catch{
                    return
                }

                if (CLIENT.CURCLASS.name === promise){
                    return
                }

                for (let course of CLIENT.courses){
                    if (course.name === promise){
                        alert("Name change failed. Names cannot be repeated;")
                        return
                    }
                }

                CLIENT.CURCLASS.name = promise
                CLIENT.save()
                CLIENT.load_courses()
                CLIENT.CURCLASS.display()
            }
        },
        {
            "check": factory.or(factory.has_class("edit__icon"), (e) => {return e.parentElement.classList.contains("edit__icon")}),
            "action": async () => {
                let promise
                try{
                    promise = await ask("Change Icon",
                        "A comprehensive list of icons can be found at <a href='https://fontawesome.com/search?o=r&m=free' target='_blank'>Font Awesome</a>. Only free tier icons are allowed. Please be sure to copy both the prefix (fa-solid, fa-regular, fa-brand, etc.) and the icon name",
                        {"value": CLIENT.CURCLASS.icon})
                }catch{
                    return
                }

                CLIENT.CURCLASS.icon = promise
                CLIENT.save()
                CLIENT.load_courses()
                CLIENT.CURCLASS.display()
            }
        },
        {
            "check": factory.is_id("add_course"),
            "action": () => {
                CLIENT.add_course()
            }
        },
        {
            "check": factory.is_id("delete_class"),
            "action": async () => {
                let promise
                try {
                    promise = await areyousure(`Are you sure you want to delete ${CLIENT.CURCLASS.name}?`,
                        "You CANNOT revert this action.", {
                            "text": "Yes, I am sure.",
                            "style": "background: var(--intense-background)"
                        },
                        {"text": "No, please go back.", "style": "background: #097969;"})
                }catch{
                    return
                }

                CLIENT.courses.splice(CLIENT.CURCLASS.id, 1)
                CLIENT.renumber_courses()
                CLIENT.save()
                CLIENT.load_courses()
                try{
                    CLIENT.load_course(0)
                }catch{
                    CLIENT.add_course()
                }
            }
        }
    ],
    "dblclick": [
        {
            "check": factory.or(factory.has_class("student"), (e) => {return e.parentElement.classList.contains("student")}),
            "action": (e) => {
                if (e.parentElement.classList.contains("student")){
                    e = e.parentElement
                }
                if (e.classList.contains("student__new")){
                    return
                }
                CLIENT.CURCLASS.freeze()
                let replacement = document.getElementById("template__student__new").content.cloneNode(true)
                replacement.querySelector("input").value = e.innerText
                replacement.querySelector(".student").setAttribute("data-id", e.getAttribute("data-id"))
                replacement.querySelector(".student").style.order = e.getAttribute("data-id")
                e.replaceWith(replacement)
                document.querySelector(".student input").focus()
            }
        }
    ],
    "keyup": [
        {
            "check": (e, event) => {
                return event.key === "Enter" && e.nodeName === "INPUT" && e.parentElement.classList.contains("student")
            },
            "action": () => {
                if (!CLIENT.CURCLASS.freeze()){
                    return
                }
                events.click[0].action()
                document.querySelector(".student input").focus()
            }
        }
    ],
    "mousedown": [
        {
            "check": (e) => {
                return (e.classList.contains("student") || e.parentElement.classList.contains("student")) &&
                    !(document.querySelector(".edit__students").querySelector(".student__new"))
            },
            "action": (e) => {
                if (e.parentElement.classList.contains("student")){
                    e = e.parentElement
                }
                e.classList.add("move")
                state.cur_drag = e
                state.cur_drag_offset = e.getBoundingClientRect().top
            }
        }
    ],
    "mouseup": [
        {
            "check": () => {return Boolean(state.cur_drag)},
            "action": (e) => {
                state.cur_drag.style.top = 0
                state.cur_drag.classList.remove("move")
                state.cur_drag = undefined
                state.cur_drag_offset = undefined

                // Redo roster
                let roster = find_element(-1, "list")
                CLIENT.CURCLASS.roster.roster = roster.map(e => CLIENT.CURCLASS.roster.roster[Number(e.getAttribute("data-id"))])
                CLIENT.CURCLASS.roster.renumber()
                CLIENT.save()
            }
        }
    ],
    "mousemove": [
        {
            "check": () => {return Boolean(state.cur_drag)},
            "action": (x, e) => {
                let offset  = e.pageY - state.cur_drag_offset
                state.cur_drag.style.top = (offset)+ "px"


                if (offset >= 40){
                    let id = state.cur_drag.getAttribute("data-id")
                    let next = find_element(Number(id), "next")
                    if (!next){
                        state.cur_drag.style.top = 0
                        return
                    }
                    if (Number(next.getAttribute("data-id")) > id){
                        state.cur_drag.style.order = Number(next.style.order) + 1
                    }else{
                        state.cur_drag.style.order = Number(next.style.order)
                    }
                    state.cur_drag.style.top = 0
                    state.cur_drag_offset = state.cur_drag.getBoundingClientRect().top
                }
                if (offset <= -40){
                    let id = state.cur_drag.getAttribute("data-id")
                    let prev = find_element(Number(id), "prev")
                    if (!prev){
                        state.cur_drag.style.top = 0
                        return
                    }
                    if (Number(prev.getAttribute("data-id")) > id){
                        state.cur_drag.style.order = Number(prev.style.order)
                    }else{
                        state.cur_drag.style.order = Number(prev.style.order) - 1
                    }
                    state.cur_drag.style.top = 0
                    state.cur_drag_offset = state.cur_drag.getBoundingClientRect().top
                }
            }
        }
    ]
}

for (let eventType in events){
    document.body["on" + eventType] = (e) => {
        let element = e.target

        for (let event of events[eventType]){
            if (event.check(element, e)){
                event.action(element, e)
            }
        }

    }
}

const find_element = (id, action) => {
    let arr = Array.from(document.querySelector(".edit__students").querySelectorAll(".student"))
    arr .sort(function(a,b) {
        let a_order = a.style.order ? parseInt(a.style.order) : 0
        let b_order = b.style.order ? parseInt(b.style.order) : 0

        if (a_order !== b_order){
            return a_order - b_order
        }

        let a_id = Number(a.getAttribute("data-id"))
        let b_id = Number(b.getAttribute("data-id"))

        return a_id - b_id
    });

    if (action === "list"){
        return arr
    }

    for (let i = 0; i < arr.length; i++){
        if (Number(arr[i].getAttribute("data-id")) === id){
            if (action === "next"){
                return arr[i + 1]
            }else if (action === "prev"){
                return arr[i - 1]
            }
        }
    }
}


const ask = (title, description, attributes) => {
    let element = document.querySelector("#template__input").content.cloneNode(true)
    element.querySelector(".title-text").innerHTML = title
    element.querySelector(".desc").innerHTML = description

    if (!description){
        element.querySelector(".desc").remove()
    }

    for (let attr in attributes){
        element.querySelector(".input").setAttribute(attr, attributes[attr])
    }

    document.body.append(element)

    return new Promise((resolve, reject) => {
        document.querySelector(".modal .submit").onclick = () => {
            let value = document.querySelector(".modal .input").value
            document.querySelector(".modal__wrapper").remove()
            resolve(value)
        }

        document.querySelector(".modal .title-close").onclick = () => {
            document.querySelector(".modal__wrapper").remove()
            reject()
        }
    });

}

const areyousure = (title, description, affirm, negate) => {
    let element = document.querySelector("#template__are_you_sure").content.cloneNode(true)
    element.querySelector(".title-text").innerHTML = title
    element.querySelector(".desc").innerHTML = description

    if (!description){
        element.querySelector(".desc").remove()
    }

    for (let attr in affirm){
        element.querySelector(".affirm").setAttribute(attr, affirm[attr])
    }
    element.querySelector(".affirm").innerText = affirm.text ?? "Yes"

    for (let attr in negate){
        element.querySelector(".negate").setAttribute(attr, negate[attr])
    }

    element.querySelector(".negate").innerText = negate.text ?? "No"

    document.body.append(element)

    return new Promise((resolve, reject) => {
        document.querySelector(".modal .affirm").onclick = () => {
            document.querySelector(".modal__wrapper").remove()
            resolve()
        }

        document.querySelector(".modal .negate").onclick = () => {
            document.querySelector(".modal__wrapper").remove()
            reject()
        }

        document.querySelector(".modal .title-close").onclick = () => {
            document.querySelector(".modal__wrapper").remove()
            reject()
        }
    });

}

let CLIENT = new Client("data")
CLIENT.load()
CLIENT.load_courses()

if (!(CLIENT.courses.length)){
    CLIENT.add_course()
}

CLIENT.load_course(0)
