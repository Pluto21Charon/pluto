window.onload = function () {
  // PDF viewer functionality
  var defaultPdfUrl = "http://127.0.0.1:8080/uploads/default.pdf";
  var viewerUrl =
    "http://127.0.0.1:8080/pdfjs-3.7.107-dist/web/viewer.html?file=" +
    defaultPdfUrl;
  document.getElementById("pdf-iframe").src = viewerUrl;

  document
    .getElementById("select-pdf")
    .addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (file.type != "application/pdf") {
        console.error(file.name, "is not a .pdf file.");
        return;
      }

      var formData = new FormData();
      formData.append("file", file);

      axios
        .post("http://localhost:8080/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })
        .then(function (response) {
          console.log("File upload response:", response);
          var pdfUrl = response.data.fileUrl;
          var viewerUrl =
            "http://localhost:8080/pdfjs-3.7.107-dist/web/viewer.html?file=" +
            pdfUrl;
          console.log("New viewer URL:", viewerUrl);
          document.getElementById("pdf-iframe").src = viewerUrl;
        })
        .catch(function (error) {
          console.error("Error:", error);
        });
    });

  // Function to flatten tree data into nodes and edges for vis.js
  // 定义一个颜色数组，这里使用了一些素雅、清淡的颜色。你可以根据需要调整这些颜色。
  // 定义一个颜色数组，这里使用了一些莫雅迪色系的颜色。你可以根据需要调整这些颜色。
  var colors = [
    "#334D5C", // 莫雅迪蓝色
    "#45B29D", // 莫雅迪绿色
  ];

  // Function to flatten tree data into nodes and edges for vis.js

  // Function to flatten tree data into nodes and edges for vis.js
  function flattenData(data, parentId = null, level = 0) {
    var nodes = [];
    var edges = [];

    nodes.push({
      id: data.id,
      label: data.label,
      example: data.example || "", // 添加example字段，如果该节点没有example则为默认空字符串
      shape: "box",
      color: {
        background: colors[level % colors.length],
        border: colors[level % colors.length],
      },
      font: {
        color: "white",
      },
    });

    if (parentId) {
      edges.push({
        from: parentId,
        to: data.id,
      });
    }

    if (data.children) {
      data.children.forEach(function (child) {
        var flattenedChild = flattenData(child, data.id, level + 1);
        nodes = nodes.concat(flattenedChild.nodes);
        edges = edges.concat(flattenedChild.edges);
      });
    }

    return {
      nodes: nodes,
      edges: edges,
    };
  }

  // Mindmap drawing functionality
  document.getElementById("draw").addEventListener("click", function () {
    var inputText = document.getElementById("input-text").value;
    var treeData = null;
    try {
      treeData = JSON.parse(inputText);
    } catch (e) {
      var container = document.getElementById("mindmap-display");
      container.innerHTML =
        "<p style='color:red;'>JSON parsing error: " +
        e.message +
        "</p>" +
        "<pre>" +
        inputText.replace(/</g, "&lt;").replace(/>/g, "&gt;") +
        "</pre>";
      return;
    }

    var data = flattenData(treeData);
    var container = document.getElementById("mindmap-display");
    // Clear old mindmap before drawing a new one
    container.innerHTML = "";

    var options = {
      nodes: {
        shape: "box",
        margin: 10,
        font: {
          multi: "html",
        },
        chosen: {
          node: function (values) {
            values.color = "#000000"; // 更改字体颜色
            values.shadowColor = "#ffffff"; // 应用白色阴影
          },
        },
      },
      edges: {
        smooth: true,
        arrows: { to: true },
      },
      layout: {
        hierarchical: {
          direction: "LR", // Up-Down
          sortMethod: "directed",
          levelSeparation: 100,
        },
      },
      interaction: {
        hover: true,
        selectConnectedEdges: false,
      },
    };
    var network = new vis.Network(container, data, options);
    network.on("selectNode", function (params) {
      var nodeId = params.nodes[0]; // 获取被选中的节点ID
      var node = data.nodes.find(function (node) {
        return node.id === nodeId;
      }); // 从所有节点中找到被选中的节点
      if (node) {
        document.getElementById("node-info").textContent = node.example; // 更新node-info的内容
      }
    });

    // 更新下载链接
    var dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(inputText);
    var downloadLink = document.getElementById("download-link");
    downloadLink.setAttribute("href", dataStr);

    network.on("click", function (properties) {
      var nodeId = properties.nodes[0]; // 获取被点击的节点的ID
      // 这里我们假设你的节点数据包含一个名为 'example' 的字段
      var nodeExample = nodes.get(nodeId).example;
      // 在思维导图空白处显示这个 'example' 字段的内容
      document.getElementById("mindmap-blank").textContent = nodeExample;
    });
  });
  document
    .getElementById("import-mindmap")
    .addEventListener("click", function () {
      document.getElementById("file-input").click();
    });

  document
    .getElementById("file-input")
    .addEventListener("change", function (e) {
      var file = e.target.files[0];
      if (file.type != "application/json") {
        console.error(file.name, "is not a .json file.");
        return;
      }

      var reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById("input-text").value = e.target.result;
      };
      reader.readAsText(file);
    });

  // 计算token数量
  function updateTokenCount() {
    var inputText = document.getElementById("input-text").value;
    var tokenCountElement = document.getElementById("token-count");
    var tokenDisplayElement = document.getElementById("token-display");

    var tokenCount = 0;
    for (var i = 0; i < inputText.length; i++) {
      var charCode = inputText.charCodeAt(i);
      if (charCode <= 0x7f) {
        tokenCount += 1;
      } else {
        tokenCount += 2;
      }
    }

    if (tokenCount === 0) {
      tokenCountElement.textContent = "";
      tokenDisplayElement.textContent =
        "输入框token数量:0,GPT-4 最大 token：32768";
    } else {
      tokenCountElement.textContent = "Token count: " + tokenCount;
      tokenDisplayElement.textContent = ", GPT-4 最大 token：32768";
    }
  }

  // 绑定文本框的输入事件
  document.getElementById("input-text").addEventListener("input", function () {
    updateTokenCount();
  });

  updateTokenCount(); // Update token count right away

  // 用于发送GPT-4请求并处理响应的函数
  var makeGpt4Request = function (prompt, buttonId) {
    var buttonElement = document.getElementById(buttonId);

    // 禁用按钮并改变其颜色为灰色
    buttonElement.disabled = true;
    buttonElement.style.backgroundColor = "gray";

    // 设置超时，如果在200秒内没有响应，则显示错误信息并重新启用按钮
    var timeoutId = setTimeout(function () {
      var container = document.getElementById("mindmap-display");
      container.innerHTML = "请求超时";
      buttonElement.disabled = false;
      buttonElement.style.backgroundColor = ""; // 恢复按钮原有颜色
    }, 200000); // 设置超时为200秒

    // 发送请求
    return axios
      .post("http://localhost:8080/ask", {
        text: prompt,
      })
      .finally(function () {
        // 清除超时并重新启用按钮
        clearTimeout(timeoutId);
        buttonElement.disabled = false;
        buttonElement.style.backgroundColor = ""; // 恢复按钮原有颜色
      });
  };

  // 绑定事件监听器到"提问"按钮
  document.getElementById("ask").addEventListener("click", function () {
    var inputText = document.getElementById("input-text").value;
    makeGpt4Request(inputText, "ask")
      .then(function (response) {
        document.getElementById("mindmap-display").textContent =
          response.data.message;
      })
      .catch(function (error) {
        console.error("Error:", error);
        var container = document.getElementById("mindmap-display");
        container.innerHTML = error;
      });
  });

  // 绑定事件监听器到"生成PDF思维导图"按钮
  document
    .getElementById("generate-pdf")
    .addEventListener("click", function () {
      var inputText = document.getElementById("input-text").value;
      var prompt =
        '{"原文:{"' +
        inputText +
        '假如你是资深的英文教授，请深入逐句阅读本文的内容，并且生成至少四级以上的关键内容思维导图，保证每个关键内容都有一个原文的example例句。输出json格式如下{{"id": "1", "label": "根节点","example":example_text, "children": [{"id": "2", "label": "子节点1","example":example_text, "children": [{"id": "3", "label": "孙节点1","example":example_text, "children": [{"id": "4", "label": "重孙节点1","example":example_text, "children": [{"id": "5", "label": "曾重孙节点1","example":example_text, "children": [{"id": "6", "label": "玄孙节点1","example":example_text}, {"id": "7", "label": "玄孙节点2","example":example_text}]}, {"id": "8", "label": "曾重孙节点2","example":example_text}]}, {"id": "9", "label": "重孙节点2","example":example_text}]}, {"id": "10", "label": "孙节点2","example":example_text}]}, {"id": "11", "label": "子节点2","example":example_text}]}}，一定要进行json语法检查,输出符合Json格式';
      makeGpt4Request(prompt, "generate-pdf")
        .then(function (response) {
          var container = document.getElementById("mindmap-display");
          var treeData = null;
          try {
            treeData = JSON.parse(response.data.message);
            var data = flattenData(treeData);

            // 清空旧的思维导图，然后绘制新的
            container.innerHTML = "";
            var options = {};
            var network = new vis.Network(container, data, options);
            // 更新下载链接
            var dataStr =
              "data:text/json;charset=utf-8," +
              encodeURIComponent(JSON.stringify(treeData, null, 2));
            var downloadLink = document.getElementById("download-link");
            downloadLink.setAttribute("href", dataStr);

            // 处理节点被选中的事件
            network.on("selectNode", function (params) {
              var nodeId = params.nodes[0]; // 获取被选中的节点ID
              var node = data.nodes.find(function (node) {
                return node.id === nodeId;
              }); // 从所有节点中找到被选中的节点
              if (node) {
                document.getElementById("node-info").textContent = node.example; // 更新node-info的内容
              }
            });
          } catch (e) {
            // 如果JSON解析出错，显示错误信息
            container.innerHTML =
              "<p style='color:red;'>JSON parsing error: " + e.message + "</p>";
          }
        })
        .catch(function (error) {
          console.error("Error:", error);
          var container = document.getElementById("mindmap-display");
          container.innerHTML = error;
        });
    });
};
