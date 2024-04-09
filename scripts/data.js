class Student{
    constructor (name){
        this.name = name
    }

    get repr(){
        return this.name
    }
}

class Roster {
    #client
    constructor(raw_roster, client) {
        this.roster = Array.from(raw_roster) // List[Student]
        this.#client = client
    }

    update(index, next){
        this.roster[index] = next
        this.#client.save()
    }

    append(next){
        this.roster.push(next)
        this.#client.save()
        this.renumber()
        return this.roster.length - 1
    }

    remove(index) {
        this.roster.splice(index, 1)
        this.renumber()
        this.#client.save()
    }

    renumber(){
        document.querySelector("#edit__title .edit__data").innerText = `${this.roster.length} Student${this.roster.length === 1 ? '' : 's'}`

        let elements = find_element(-1, "list")
        for (let i = 0; i < elements.length; i++){
            elements[i].setAttribute("data-id", i)
            elements[i].style.order = i
        }
    }

    get repr(){
        return this.roster.map(e => e.repr)
    }

    display() {
        document.querySelectorAll(".edit__students .student").forEach(e => e.remove())

        let index = 0;
        for (let student of this.roster){
            let element = document.getElementById("template__student").content.cloneNode(true)
            element.querySelector("span").innerText = student.name
            element.querySelector(".student").setAttribute("data-id", index)

            element.querySelector(".student").style.order = index

            document.getElementById("add_student").parentElement.insertBefore(
                element,
                document.getElementById("add_student"))

            index += 1;
        }
    }

    // Save any current input boxes and exit
    freeze() {
        let status = true
        document.querySelectorAll(".student__new").forEach(e => {
            let value = e.querySelector("input").value.trim()

            if (!value){
                e.remove()
                status = false
                return
            }

            let id = e.getAttribute("data-id")
            if (id === "APPEND"){
                id = this.append(new Student(value))
            }else{
                this.update(Number(id), new Student(value))
            }

            let replacement = document.getElementById("template__student").content.cloneNode(true)
            replacement.querySelector("span").innerText = value
            replacement.querySelector(".student").setAttribute("data-id", id)
            replacement.querySelector(".student").style.order = id
            e.replaceWith(replacement)
        })
        this.#client.save()
        return status
    }
}


class Course {
    #client
    constructor(name, icon, id, roster, client){
        this.name = name
        this.icon = icon
        this.id = id
        this.roster = roster // Type Roster()
        this.#client = client
    }

    get repr() {
        return {
            icon: this.icon,
            id: this.id,
            roster: this.roster.repr,
        }
    }

    display(){
        // Clear Everything
        document.querySelector("#edit__title .edit__icon i").classList.remove(...
            document.querySelector("#edit__title .edit__icon i").classList);

        document.querySelector("#edit__title .edit__name").innerText = this.name
        document.querySelector("#edit__title .edit__data").innerText = `${this.roster.roster.length} Students`
        document.querySelector("#edit__title .edit__icon i").classList.add(...this.icon.split(" "), "fa-fw")

        this.roster.display()
    }

    freeze(){
        return this.roster.freeze()
    }
}

class Client {
    #port
    constructor (port){
        this.#port = port
        this.courses = []
        this.CURCLASS = undefined
    }

    load(port = this.#port) {
        let data;
        try{
            data = JSON.parse(localStorage[port])
        }catch{
            data = ""
        }

        for (let [name, course] of Object.entries(data)){
            this.courses.push(new Course(name, course.icon, course.id, new Roster(course.roster.map(e => new Student(e)), this), this))
        }
    }

    load_courses() {
        document.getElementById("class-list").innerHTML = ""

        let index = 0
        for (let course of this.courses){
            let course_element = document.getElementById("template__class").content.cloneNode(true)
            course_element.querySelector(".class-list__item__icon i").classList.add(...course.icon.split(" "), "fa-fw")
            course_element.querySelector(".class-list__item__name").innerText = course.name
            course_element.querySelector(".class-list__item").setAttribute("data-id", index)

            document.getElementById("class-list").append(course_element)

            index += 1
        }

        let add = document.getElementById("template_add_course").content.cloneNode(true)
        document.getElementById("class-list").append(add)
    }

    renumber_courses() {
        for (let i = 0; i < this.courses.length; i++){
            this.courses[i].id = i
        }
    }

    load_course(index){
        this.courses[index].display()
        this.CURCLASS = this.courses[index]
    }

    save(port = this.#port){
        let res = {}
        for (let course of this.courses){
            res[course.name] = course.repr
        }

        localStorage[port] = JSON.stringify(res)
        return localStorage[port]
    }

    add_course() {
        let count = 0
        for (let course of this.courses){
            if (course.name.startsWith("Untitled Class")){
                count += 1
            }
        }
        this.courses.push(new Course(`Untitled Class (${count + 1})`, "fa-solid fa-book", this.courses.length, new Roster([], this), this))
        CLIENT.load_courses()
        CLIENT.save()
    }
}

let factory = {
    is_id: (id) => {return (e) => {return e.id === id}},
    has_class: (clsname) => {return (e) => {return e.classList.contains(clsname)}},
    or: (x, y) => {return (...e) => {return x(...e) || y (...e)}}
}