let CLIENT = new Client("data")
CLIENT.load()

const init = () => {
    let template = document.querySelector("#template__course")

    for (let course of CLIENT.courses){
        let element = template.content.cloneNode(true)
        element.querySelector("input").id = `COURSE-${course.id}`
        element.querySelector("input").name = course.id
        element.querySelector("label").setAttribute("for", `COURSE-${course.id}`)
        element.querySelector("label").setAttribute("for", `COURSE-${course.id}`)
        element.querySelector("label span").innerText = course.name
        element.querySelector("label i").classList.add(...course.icon.split(" "))
        document.querySelector("#options_include").append(element)
    }
}

init()

const process = (classes, style="Name") => { // list of ids
    let students = {}
    let max_shared = 0

    let map = []

    let i = 1;
    for (let course_id of classes){
        let course = CLIENT.courses[course_id]
        for (let student of course.roster.roster){
            if (!students.hasOwnProperty(student.name)){
                students[student.name] = []
            }
            if (style === "Name"){
                students[student.name].push(course.name)
            }else{
                students[student.name].push(i)
            }

        }
        map.push(new docx.Paragraph({text: `${i}: ${course.name}`}))
        i += 1
    }

    let shared = {}

    for (let [student, courses] of Object.entries(students)){
        if (!shared.hasOwnProperty(courses.length)){
            shared[courses.length] = []
        }
        shared[courses.length].push([student, courses])
    }

    let shared_sorted = []

    for (let key in shared){
        shared_sorted.push([Number(key), shared[key]])
    }

    shared_sorted.sort((a, b) => b[0] - a[0])

    for (let i = 0; i < shared_sorted.length; i++){
        shared_sorted[i][1].sort((a, b) => {
            return (a[0].toLocaleLowerCase().split(" ").at(-1)).localeCompare(b[0].toLocaleLowerCase().split(" ").at(-1))
        })
    }

    if (style === "Number"){
        return [shared_sorted, map]
    }

    return [shared_sorted]
}

document.querySelector("#go").onclick = () => {
    let req = []
    for (let checkbox of document.querySelectorAll(".option input")){
        if (!(checkbox.checked)){
            continue
        }
        req.push(Number(checkbox.getAttribute("name")))
    }

    create_document(...process(req, document.querySelector("#options_select").value))
}

const create_document = (data, extra) => {
    let paragraphs = extra ?? []

    for (let [number, students] of data){
        paragraphs.push(
            new docx.Paragraph({
                text: `${number} Class${number === 1 ? '' : 'es'}`,
                heading: docx.HeadingLevel.HEADING_1,
            })
        )

        for (let student of students) {
            paragraphs.push(new docx.Paragraph({
                children: [
                    new docx.TextRun(student[0]),
                    new docx.TextRun({
                        children: [
                            new docx.PositionalTab({
                                alignment: docx.PositionalTabAlignment.RIGHT,
                                relativeTo: docx.PositionalTabRelativeTo.MARGIN,
                                leader: docx.PositionalTabLeader.DOT,
                            }),
                            ` (${student[1].join(", ")})`,
                        ],
                    }),
                ],
            }))
        }
    }

    let doc = new docx.Document({
        creator: "ClassCounter",
        title: "ClassCounter",
        description: "Classes Shared",
        styles: {
            default: {
                heading1: {
                    run: {
                        font: "Times New Roman",
                        size: "18pt",
                        bold: true,
                    },
                    paragraph: {
                        spacing: {
                            before: "18pt",
                            after: "12pt"
                        }
                    }
                },
                title: {
                    run: {
                        font: "Times New Roman",
                        size: "22pt",
                        bold: true
                    },
                    paragraph: {
                        alignment: docx.AlignmentType.LEFT,
                    }
                },
                document: {
                    run: {
                        size: "11pt",
                        font: "Times New Roman"
                    }
                }
            }
        },
        sections: [
            {
                children: [
                    new docx.Paragraph({
                        text: "Class Rosters and Comparison",
                        heading: docx.HeadingLevel.TITLE,
                        alignment: docx.AlignmentType.CENTER,
                    }),
                    new docx.Paragraph({
                        children: [
                            new docx.TextRun({
                                text: "As of " + new Date().toLocaleString('default', {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }),
                                italics: true,
                                size: "14pt"
                            })
                        ],
                        alignment: docx.AlignmentType.CENTER,
                    }),
                    ...paragraphs
                ]
            }
        ]
    })

    // Create a mime type that will associate the new file with Microsoft Word
    const mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    docx.Packer.toBlob(doc).then(blob => {
        docPreview.renderAsync(blob, document.getElementById("container"), null, {ignoreWidth: false})
            .then(x => console.log("docx: finished"));

        document.getElementById("download").style.display = "block"
        document.getElementById("download").onclick = () => {
            saveAs(blob, "Class Comparison.docx")
        }
    })
}

document.querySelector("#options_header").onclick = () => {
    document.querySelector("#options_header i").classList.toggle("fa-angle-right")
    document.querySelector("#options_header i").classList.toggle("fa-angle-down")
    document.querySelector("#results_options").classList.toggle("min")
}
